import * as express from "express";
import { NextFunction } from "express";
import * as userService from "@service/user.service";
import httpStatus from "http-status";
import logger from "@modules/logger";
import ApiError from "@modules/api.error";
import { Controller, Example, Get, Path, Post, Query, Request, Response, Route, Security, Tags } from "tsoa";
import { errorHandler } from "@modules/error";
import * as authService from "@service/auth.service";
import env from "@modules/env";
import { apiStatus } from "@modules/api.status";
import { ResJson, ErrorJson } from "@modules/response";
import { noticer } from '@modules/discord';
import { CLUSTER_CODE } from '@modules/cluster';
import * as historyService from "@service/history.service";
import * as usageService from "@service/usage.service";
import { getPlainObject } from "@modules/utils";
import { UsageAttributes } from "@models/usages";

export interface CheckInRes {
    /**
     * Card number
     */
    card_no?: number;
    /**
     * The User state after checkin
     *
     * @example 'checkIn', 'checkOut', 'null'
     */
    state?: string;
    /**
     * The Previous user state before checkin. The value is 'checkIn' if duplicate checkin operation.
     */
    prev_state?: string;
    /**
     * A discord notification result when an available count is less than 5
     */
    notice?: boolean;
}

export interface CheckOutResponse {
    /**
     * HTTP status code
     */
    status: number;
    /**
     * CheckOut Result
     */
    result: boolean;
    /**
     * API Result code
     */
    code?: number;
    /**
     * Result message
     */
    message?: string;
}

export interface UserStatus {
    login: string;
    card: number;
    state: string;
    log_id: number;
    checkin_at: Date;
    checkout_at: Date;
    profile_image_url: string;
}

export interface UserStatusJSON {
    login: string;
    card: number;
    state: string;
    log_id: number;
    checkin_at: string;
    checkout_at: string;
    profile_image_url: string;
}

export interface UserStatusResponse {
    user: UserStatus | UserStatusJSON;
    isAdmin: boolean;
}

export interface UsageJSON {
    _id: number;
    login?: string;
    checkin_at?: string;
    checkout_at?: string;
    duration?: number;
    actor?: string;
    deleted_at?: Date;
    updated_at?: string;
    created_at?: string;
}

export interface UsageDaily {
    login: string;
    date: Date;
    seconds: number;
}

export interface UsageDailyJSON {
    login: string;
    date: string;
    seconds: string;
}

@Route("v1/user")
@Tags("User")
export class UserController extends Controller {
    /**
     * 유저 체크인
     */
    @Example<ResJson<CheckInRes>>({
        status: 200 /* OK */,
        result: true,
        code: 2000 /* OK */,
        payload: {
            card_no: 10,
            state: "checkIn",
            prev_state: "checkOut",
            notice: false,
        },
    })
    @Example<ResJson<CheckInRes>>({
        status: 200 /* OK */,
        result: false,
        code: 4090 /* CONFLICT */,
        message: "이미 체크인 상태입니다",
        payload: {
            card_no: 10,
            state: "checkIn",
            prev_state: "checkIn",
            notice: false,
        },
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(401, "Unauthorized", {
        status: 401 /* UNAUTHORIZED */,
        code: 4010 /* UNAUTHORIZED */,
        message: "사용자 정보 없음",
        result: false,
    })
    @Response<ErrorJson>(406, "Not Acceptable", {
        status: 406 /* NOT_ACCEPTABLE */,
        code: 4060 /* NOT_ACCEPTABLE */,
        message: "체크인 가능 시간이 아닙니다.",
        result: false,
    })
    @Response<ErrorJson>(409, "Not Acceptable", {
        status: 409 /* NOT_ACCEPTABLE */,
        code: 4090 /* NOT_ACCEPTABLE */,
        message: "이미 사용 중인 카드입니다. cardOwner: cadet",
        result: false,
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    /**
     * @param cardId The card number
     * @example cardId "1"
     * @example cardId "1024"
     */
    @Security("CookieAuth")
    @Post("/checkIn/{cardId}")
    public async checkIn(@Path() cardId: number, @Request() req:express.Request): Promise<ResJson<CheckInRes>> {
        let notice = false;
        const userId = req.user?.jwt?._id;
        if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, null, "사용자 정보 없음");
        logger.log('userId: ', userId, ', cardId: ', cardId);

        /** 중복 체크인 체크 */
        const user = await userService.getUserById(userId);
        const userPrevState = user.state;
        let payload = {
            card_no: user.card_no,
            prev_state: userPrevState,
            state: 'checkIn',
            notice: notice
        }
        this.setStatus(httpStatus.OK);
        if (['checkin'].includes(user!.state!.toLowerCase()))
            return new ResJson(httpStatus.OK, apiStatus.CONFLICT, false, '이미 체크인 상태입니다.', payload);

        /** 체크인 가능 시간 체크 */
        const isAdmin = await userService.isAdmin(user!);
        const available = await userService.isCheckAvailable();
        if (!isAdmin && !available) throw new ApiError(httpStatus.NOT_ACCEPTABLE, null, '체크인 가능 시간이 아닙니다.');

        /** 카드 중복 체크 */
        const cardOwner = await userService.getCardOwner(cardId);
        if (cardOwner) throw new ApiError(httpStatus.CONFLICT, null, `이미 사용 중인 카드입니다. cardOwner : ${cardOwner.login}`)

        /** 클러스터 출입 인원 체크 */
        const clusterType = await user.getClusterType(cardId);
        const { enterCnt, maxCnt, result } = await userService.checkCanEnter(clusterType, 'checkIn');
        logger.log('login: ', user.login, 'card_no: ', cardId, 'max: ', maxCnt, 'used: ', enterCnt);
        if (!result) throw new ApiError(httpStatus.NOT_ACCEPTABLE, null, `[${enterCnt}/${maxCnt}] 클러스터 최대 출입 인원을 초과하였습니다.`)

        /* 남은 인원이 5명 이하인 경우, 몇 명 남았는지 디스코드로 노티 */
        if (enterCnt + 1 >= maxCnt - 5) {
            await noticer(CLUSTER_CODE[clusterType], maxCnt - enterCnt + 1);
            notice = true;
        }

        /** update history */
        user.card_no = cardId;
        let history = await historyService.create(user, 'checkIn');
        await user.setState('checkIn', user.login, cardId, history._id);

        payload = {
            card_no: user.card_no,
            prev_state: userPrevState,
            state: 'checkIn',
            notice: notice
        }
        return new ResJson<CheckInRes>(httpStatus.OK, apiStatus.OK, true, null, payload);
    }

    /**
     * 유저 체크아웃
     */
    @Example<ResJson<null>>({
        status: 200 /* OK */,
        code: 2000 /* OK */,
        result: true,
        message: "checkout",
    })
    @Example<ResJson<null>>({
        status: 200 /* OK */,
        code: 4090 /* CONFLICT */,
        result: false,
        message: "이미 체크아웃 하셨습니다.",
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(401, "Unauthorized", {
        status: 401 /* UNAUTHORIZED */,
        code: 4010 /* UNAUTHORIZED */,
        result: false,
        message: "사용자 정보 없음",
    })
    @Response<ErrorJson>(406, "Not Acceptable", {
        status: 406 /* NOT_ACCEPTABLE */,
        code: 4060 /* NOT_ACCEPTABLE */,
        message: "체크아웃 가능 시간이 아닙니다.",
        result: false,
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Post("/checkOut")
    public async checkOut(@Request() req: express.Request): Promise<ResJson<null>> {
        let notice = false;
        const userId = req.user?.jwt?._id;
        if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, null, "사용자 정보 없음");
        logger.log('userId: ', userId);

        const user = await userService.getUserById(userId);
        const _user = Object.assign(user);
        _user['profile'] = {};
        logger.info('checkOut', JSON.stringify(_user));

        /** 중복 체크아웃 체크 */
        if (!['checkin'].includes(user.state?.toLowerCase()))
            return new ResJson(httpStatus.OK, apiStatus.CONFLICT, false, '이미 체크아웃 하셨습니다.');

        /** 체크아웃 가능시간 체크 */
        const isAdmin = await userService.isAdmin(user!);
        const available = await userService.isCheckAvailable();
        if (!isAdmin && !available) throw new ApiError(httpStatus.NOT_ACCEPTABLE, null, '체크아웃 가능 시간이 아닙니다.');

        /** usage && history update */
        await usageService.create(user, user.login);
        let history = await historyService.create(user, 'checkOut');
        const clusterType = user.getClusterType(user.card_no)
        await user.setState('checkOut', user.login, null, history._id);

        /* 남은 인원이 5명 이하인 경우, 몇 명 남았는지 디스코드로 노티 */
        const { enterCnt, maxCnt } = await userService.checkCanEnter(clusterType);
        if (enterCnt + 1 >= maxCnt - 5) {
            await noticer(CLUSTER_CODE[clusterType], maxCnt - enterCnt + 1);
            notice = true;
        }

        this.setStatus(httpStatus.OK);
        return new ResJson(httpStatus.OK, apiStatus.OK, true, "checkOut");
    }

    /**
     * 유저 상태조회
     */
    @Example<ResJson<UserStatusResponse>>({
        status: 200,
        code: 200,
        result: true,
        payload: {
            user: {
                login: "chaepark",
                card: 25,
                state: "checkIn",
                log_id: 5,
                checkin_at: "2022-02-02T07:59:24.000Z",
                checkout_at: null,
                profile_image_url: "https://cdn.intra.42.fr/users/chaepark.jpg"
            },
            isAdmin: false
        }
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(401, "Unauthorized", {
        status: 401 /* UNAUTHORIZED */,
        code: 4010 /* UNAUTHORIZED */,
        result: false,
        message: "사용자 정보 없음",
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/status")
    public async status(@Request() req: express.Request): Promise<ResJson<UserStatusResponse>> {
        const userId = req.user?.jwt._id
        if (!userId)
            throw new ApiError(httpStatus.UNAUTHORIZED, null, "사용자 정보 없음");
        logger.log("userId:", userId);

        const payload = await userService.status(userId);
        logger.info('status', payload);

        this.setStatus(httpStatus.OK);
        return new ResJson<UserStatusResponse>(httpStatus.OK, apiStatus.OK, true, null, payload);
    }

    /**
     * 기간 내 유저 사용 정보 조회
     * @param from
     * @example from "2022-01-31"
     * @param to
     * @example to "2022-02-01"
     */
    @Example<ResJson<UsageJSON[]>>({
        status: 200,
        code: 2000,
        result: true,
        payload: [
            {
                _id: 1,
                login: "chaepark",
                checkin_at: "2022-02-02T07:29:20.000Z",
                checkout_at: "2022-02-02T07:39:41.000Z",
                duration: 622,
                actor: "chaepark",
                deleted_at: null,
                updated_at: null,
                created_at: "2022-02-02T07:39:41.000Z"
            },
            {
                _id: 2,
                login: "chaepark",
                checkin_at: "2022-02-02T07:39:59.000Z",
                checkout_at: "2022-02-02T07:58:15.000Z",
                duration: 1097,
                actor: "chaepark",
                deleted_at: null,
                updated_at: null,
                created_at: "2022-02-02T07:58:15.000Z"
            },
        ]
    })
    @Example<ResJson<[]>>({
        status: 200,
        code: 4040,
        result: false,
        message: "주어진 기간 내 유저 사용 정보가 없습니다.",
        payload: []
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/usage")
    public async userUsageList(@Request() req: express.Request, @Query()from: string, @Query()to: string): Promise<ResJson<UsageAttributes[]>>{
        logger.log('req.user?.jwt:', req.user?.jwt, from, to);
        const payload = await usageService.getUsagesList(req.user?.jwt!, from, to);

        logger.info('userUsage', getPlainObject(payload));
        this.setStatus(httpStatus.OK)
        if (!payload.length)
            return new ResJson(httpStatus.OK, apiStatus.NOT_FOUND, false, "주어진 기간 내 유저 사용 정보가 없습니다.", payload);
        return new ResJson(httpStatus.OK, apiStatus.OK, true, null, payload)
    }

    /**
     * 기간 내 유저 일간 사용 정보 조회
     * @param from
     * @example from "2022-02-02"
     * @param to
     * @example to "2022-02-09"
     */
    @Example<ResJson<UsageDailyJSON[]>>({
        status: 200,
        code: 200,
        result: true,
        payload: [
            {
                "login": "chaepark",
                "date": "2022-02-02",
                "seconds": "502756"
            },
            {
                "login": "chaepark",
                "date": "2022-02-08",
                "seconds": "576"
            }
        ]
    })

    @Example<ResJson<[]>>({
        status: 200,
        code: 4040,
        result: false,
        message: "주어진 기간 내 유저의 일간 사용 정보가 없습니다.",
        payload: []
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/usage/daily")
    public async userUsageDaily(@Request() req: express.Request, @Query()from: string, @Query()to: string): Promise<ResJson<UsageDaily[]>>{
        logger.log('req.user?.jwt:', req.user?.jwt, from, to);
        const payload = await usageService.getUsagesDaily(req.user?.jwt!, from, to);

        logger.info('userUsageDaily', getPlainObject(payload));
        this.setStatus(httpStatus.OK)
        if (!payload.length)
            return new ResJson(httpStatus.OK, apiStatus.NOT_FOUND, false, "주어진 기간 내 유저의 일간 사용 정보가 없습니다.", payload)
        return new ResJson(httpStatus.OK, apiStatus.OK, true, null, payload);
    }


    /**
     * 강제 체크 아웃
     * @param req
     * @param userId
     */
    @Example<ResJson<null>>({
        status: 200,
        code: 200,
        result: true,
        message: 'Force Checkout'
    })

    @Example<ResJson<null>>({
        status: 200,
        code: 4030,
        result: false,
        message: '이미 체크아웃 상태입니다.'
    })
    @Response<ErrorJson>(401, "UNAUTHORIZED",{
        status: 401,
        code: 4040,
        result: false,
        message: '사용자 정보가 없습니다.'
    })
    @Response<ErrorJson>(401, "UNAUTHORIZED",{
        status: 401,
        code: 4040,
        result: false,
        message: '사용자를 찾을 수 없습니다.'
    })
    @Response<ErrorJson>(403, "FORBIDDEN",{
        status: 403,
        code: 4030,
        result: false,
        message: '접근 권한이 없습니다.'
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/forceCheckout/:userId")
    public async forceCheckOut(@Request() req: express.Request, @Path() userId: number){
        let notice = false;
        /* 토큰 payload 체크*/
        logger.log('req.user?.jwt:', req.user?.jwt, userId);
        if (!req.user?.jwt)
            return new ApiError(httpStatus.UNAUTHORIZED, apiStatus.USER_NOT_FOUND, '사용자 정보가 없습니다.');

        /* 유저 정보 체크 */
        const user = await userService.getUserById(userId);
        if (!user)
            return new ApiError(httpStatus.UNAUTHORIZED, apiStatus.USER_NOT_FOUND, '사용자를 찾을 수 없습니다.')

        /* 어드민 여부 체크 => 추후 미들웨어로 뺄것 */
        if (!await userService.isAdmin(user))
            return new ApiError(httpStatus.FORBIDDEN, apiStatus.FORBIDDEN, '접근 권한이 없습니다.')

        /* 중복 체크아웃 체크 */
        if (user.card_no === null)
            return new ResJson(httpStatus.OK, apiStatus.CONFLICT, false, '이미 체크아웃 상태입니다.')

        /* history, usage 업데이트 */
        await usageService.create(user, req.user?.jwt.name);
        await historyService.create(user, 'forceCheckOut');
        logger.log({
            type: 'action',
            message: 'return card',
            data: { user: user.toJSON() },
        });
        const clusterType = user.getClusterType(user.card_no)
        await user.setState('checkOut', req.user?.jwt.name);

        const { enterCnt, maxCnt } = await userService.checkCanEnter(clusterType); //현재 이용자 수 확인
        // 남은 인원이 5명이하인 경우, 몇 명 남았는지 디스코드로 노티
        if (enterCnt >= maxCnt - 5) {
            await noticer(CLUSTER_CODE[clusterType], maxCnt - enterCnt - 1);
            notice = true;
        }

        return new ResJson(httpStatus.OK, apiStatus.OK, true, "Force Checkout")
    }
}

export const login = async (req: express.Request, res: express.Response, next: NextFunction) => {
    logger.log(req.user?.jwt, req.query?.redirect);
    const redirect = req.query.redirect as string;
    if (redirect) {
        res.cookie("redirect", decodeURIComponent(redirect));
        next();
    } else {
        let msg = "Redirect URL is missing";
        logger.error("Redirect URL is missing", req.query?.direct);
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, null, msg, { stack: new Error(msg).stack, isFatal: true }), req, res, next);
    }
};

/**
 * 42API 로그인 후 리다이렉트 되는 엔드포인트입니다.
 * 42API에서 유저 정보를 가져와 JWT 토큰을 발행합니다.
 * JWT토큰을 쿠키에 w_auth로 담아 전송합니다.
 * /checkin 페이지로 리다이렉트 합니다.
 * @param req
 * @param res
 * @param next
 */
export const callback = async (req: express.Request, res: express.Response, next: NextFunction) => {
    try {
        let ft = req.user?.ft;

        logger.log(req.user?.jwt, ft);
        const { token, cookieOption } = await authService.getAuth(req.user?.ft!);
        res.cookie(env.cookie.auth!, token, cookieOption);
        res.clearCookie("redirect");
        if (req.cookies.redirect) {
            res.status(httpStatus.FOUND).redirect(req.cookies.redirect);
        } else {
            res.status(httpStatus.FOUND).redirect(env.url.client + "/checkin");
        }
    } catch (e:any) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, { stack: e.stack, isFatal: true }), req, res, next);
    }
};

export async function CheckIn(req: express.Request, res: express.Response, next:express.NextFunction) {
    try {
        const cardId = parseInt(req.params?.cardId);
        const controller = new UserController();

        const response = await controller.checkIn(cardId, req);
        const statusCode = controller.getStatus();

        logger.res(statusCode, response);
        res.status(statusCode).json(response);
    } catch (e:any) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, { stack: e.stack, isFatal: true }), req, res, next);
    }
}

export async function CheckOut(req: express.Request, res: express.Response, next:express.NextFunction) {
    try {
        const controller = new UserController();

        const response = await controller.checkOut(req);
        const statusCode = controller.getStatus();

        logger.res(statusCode, response);
        res.status(statusCode).json(response);
    } catch (e:any) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, { stack: e.stack, isFatal: true }), req, res, next);
    }
}

export async function Status(req: express.Request, res: express.Response, next:express.NextFunction) {
    try {
        const controller = new UserController();
        const result = await controller.status(req);
        const statusCode = controller.getStatus();

        logger.res(statusCode, result);
        res.status(controller.getStatus() || httpStatus.OK).json(result);
    } catch (e:any) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, { stack: e.stack, isFatal: true }), req, res, next);
    }
}

export async function UserUsageList(req: express.Request, res: express.Response, next: NextFunction) {
    try {
        const controller = new UserController();
        const result = await controller.userUsageList(req, req.query?.from, req.query?.to);
        const statusCode = controller.getStatus();

        logger.res(statusCode, result);
        res.status(statusCode).json(result);
    } catch (e: any) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

export async function UserUsageDaily(req: express.Request, res: express.Response, next: NextFunction) {
    try {
        const controller = new UserController();
        const result = await controller.userUsageDaily(req, req.query.from, req.query.to)
        const statusCode = controller.getStatus();

        logger.res(statusCode, result);
        res.status(statusCode).json(result);
    } catch (e: any) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

export async function ForceCheckOut(req: express.Request, res: express.Response, next: NextFunction) {
    try {
        const controller = new UserController();
        const result = await controller.forceCheckOut(req, parseInt(req.params?.userId));
        const statusCode = controller.getStatus();

        logger.res(statusCode, result);
        res.status(httpStatus.OK).json(result);
    } catch (e: any) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        const apiCode = e.apiCode || statusCode * 10;
        errorHandler(new ApiError(statusCode, apiCode, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
}
