import * as express from "express";
import * as userService from '@service/user.service';
import {isAdmin} from '@service/user.service';
import httpStatus from 'http-status';
import logger from '@modules/logger';
import ApiError from "@modules/api.error";
import {getConfigByDate} from "@service/config.service";
import {getTimeNumber, getTimezoneDate} from "@modules/util";
import {Controller, Get, Path, Post, Request, Response, Route} from "tsoa";
import {errorHandler} from "@modules/error";
import {NextFunction} from "express";
import * as authService from "@service/auth.service";
import env from "@modules/env";

export interface ICheckInResponse {
    /**
     * Checkin Result
     */
    result: boolean;
    /**
     * Card number
     */
    card_no?: number;
    /**
     * The User state after checkin
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

export interface ICheckOutResponse {
    /**
     * CheckOut Result
     */
    result: boolean;
}

export interface IUserStatus {
    login: string,
    card: number,
    state: string,
    log_id: number,
    checkin_at: Date,
    checkout_at: Date,
    profile_image_url: string
}

export interface IUserStatusResponse {
    user: IUserStatus,
    cluster: {
        gaepo: number,
        seocho: number
    },
    isAdmin: boolean
}

const CheckInFail: ICheckInResponse = {
    result: false,
}

const CheckOutFail: ICheckOutResponse = {
    result: false
}

/**
 * 특정 시간이 최소 시간과 최대 시간 사이에 있는지 검사한다
 * @param target 확인하려는 시간 문자열 ex) '12:00'
 * @param min 최소 시간
 * @param max 최대 시간
 *
 * @return boolean 시간이 범위에 있는지 여부
 */
const isBetween = (target: string, min: any, max: any) => {
    let now = getTimeNumber(target);
    let checkin_at = (min !== null && min !== undefined) ? getTimeNumber(min) : -1;
    let checkout_at = (max !== null && max !== undefined) ? getTimeNumber(max) : Number.MAX_SAFE_INTEGER;

    let result = (now >= checkin_at) && (now < checkout_at);
    if (!result) {
        logger.log('now: ', now, ', checkin_at: ', checkin_at, ', checkout_at: ', checkout_at);
        logger.log('now: ', getTimeNumber(target), ', min: ', min, ', max: ', max);
    }

    return result;
}

const isCheckAvailable = async (message: string) => {
    // noinspection DuplicatedCode
    const today = getTimezoneDate(new Date()).toISOString().slice(0, 10)
    const config = await getConfigByDate(today);
    if (!config) {
        let msg = `해당 날짜(${today})의 설정값이 서버에 존재하지 않습니다.`;
        logger.error(msg, 'date:', today, 'setting:', config);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, msg, {stack: new Error(msg).stack});
    }

    let now = getTimezoneDate(new Date()).toISOString().slice(11, 19);
    if (!isBetween(now, config.checkin_at, config.checkout_at)) {
        logger.log('now: ', now, ', checkin_at: ', config.checkin_at, ', checkout_at: ', config.checkout_at);
        let open_at = config.open_at ? config.open_at : '';
        let close_at = config.close_at ? config.close_at : '';
        if (!config.checkin_at && !config.close_at) {
            open_at = '00:00'
            close_at = '24:00'
        }
        let msg = `${message}\n(가능시간: ${open_at} ~ ${close_at})`;
        throw new ApiError(httpStatus.NOT_FOUND, msg, {
            stack: new Error(msg).stack,
            isFatal: false
        });
    }

    return true;
}

export const login = async (req: express.Request, res: express.Response, next: NextFunction) => {
    logger.log(req.user?.jwt, req.query?.redirect);
    const redirect = req.query.redirect as string;
    if (redirect) {
        res.cookie('redirect', decodeURIComponent(redirect));
        next();
    } else {
        let msg = 'Redirect URL is missing';
        logger.error('Redirect URL is missing', req.query?.direct);
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, msg, {stack:new Error(msg).stack, isFatal: true}), req, res, next);
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
        const { token, cookieOption } = await authService.getAuth(req.user?.ft);
        res.cookie(env.cookie.auth, token, cookieOption);
        res.clearCookie('redirect');
        if(req.cookies.redirect) {
            res.status(httpStatus.FOUND).redirect(req.cookies.redirect);
        } else {
            res.status(httpStatus.FOUND).redirect(env.url.client + '/checkin');
        }
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

@Route("v1/user")
export class UserController extends Controller {
    @Post("/checkIn/{cardId}")
    public async checkIn(
        @Path() cardId: number,
        @Request() req: express.Request,
    ): Promise<ICheckInResponse> {
        try {
            let userId = req.user?.jwt?._id;
            if (userId === undefined) {
                let msg = `사용자 정보 오류 ${userId}`;
                errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, msg, {stack:new Error().stack, isFatal: true}), null, null, null);
                return CheckInFail;
            }

            const admin = await isAdmin(userId);
            const available = admin && await isCheckAvailable('체크인 가능 시간이 아닙니다.');
            if (!available) return CheckInFail;

            const result = await userService.checkIn(userId, cardId);
            logger.res(httpStatus.OK, result);
            this.setStatus(httpStatus.OK);
            return result;
        } catch (e) {
            logger.error(e);
            const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
            this.setStatus(statusCode);
            errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, null, null);
        }

        return CheckInFail;
    }

    @Post("/checkOut")
    public async checkOut(@Request() req: express.Request): Promise<ICheckOutResponse> {
        let userId = req.user?.jwt?._id;
        if (userId === undefined) {
            let msg = `사용자 정보 오류 ${userId}`;
            errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, msg,
                {stack:new Error().stack, isFatal: true}), null, null, null);
            return CheckOutFail;
        }

        try {
            const result = await userService.checkOut(userId);
            logger.res(httpStatus.OK, result);
            this.setStatus(httpStatus.OK);
            return result;
        } catch (e) {
            logger.error(e);
            const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
            this.setStatus(statusCode);
            errorHandler(new ApiError(statusCode, e.message,
                {stack:e.stack, isFatal: true}), req, null, null);
        }

        return CheckOutFail;
    }

    /**
     * 유저 상태조회
     */
    @Get('/status')
    public async status (@Request() req: express.Request): Promise<IUserStatusResponse> {
        try {
            logger.log('req.user?.jwt:', req.user?.jwt);
            const result = await userService.status(req.user.jwt);
            logger.info(result);
            logger.res(httpStatus.OK, result);

            this.setStatus(httpStatus.OK)
            return result;
        } catch (e) {
            logger.error(e);
            const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
            errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, null, null);
        }
    };
}

export async function CheckInRouter(req: express.Request, res, next) {
    try {
        const cardId = parseInt(req.params?.cardId);
        const controller = new UserController();
        const result = await controller.checkIn(cardId, req);

        res.status(controller.getStatus() || httpStatus.OK).json(result);
    } catch (e) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
}

export async function CheckOutRouter(req: express.Request, res, next) {
    try {
        const controller = new UserController();
        const result = await controller.checkOut(req);

        res.status(controller.getStatus() || httpStatus.OK).json(result);
    } catch (e) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
}

export async function StatusRouter(req, res, next) {
    try {
        const controller = new UserController();
        const result = await controller.status(req);

        res.status(controller.getStatus() || httpStatus.OK).json(result);
    } catch (e) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
}