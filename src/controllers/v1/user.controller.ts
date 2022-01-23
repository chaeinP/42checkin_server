import * as express from "express";
import {NextFunction} from "express";
import * as userService from '@service/user.service';
import httpStatus from 'http-status';
import logger from '@modules/logger';
import ApiError from "@modules/api.error";
import {Controller, Example, Get, Path, Post, Request, Response, Route, Security} from "tsoa";
import {errorHandler} from "@modules/error";
import * as authService from "@service/auth.service";
import env from "@modules/env";
import {apiStatus} from "@modules/api.status";

export interface CheckInResponse {
    /**
     * HTTP status code
     */
    status: number;
    /**
     * Checkin result is Success or Fail
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
    /**
     * Additional Data
     */
    payload?: {
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
    login: string,
    card: number,
    state: string,
    log_id: number,
    checkin_at: Date,
    checkout_at: Date,
    profile_image_url: string
}

export interface UserStatusResponse {
    user: UserStatus,
    cluster: {
        gaepo: number,
        seocho: number
    },
    isAdmin: boolean
}

interface CheckInFail {
    status: number;
    result: boolean;
    code?: number;
    message?: string;
}

interface CheckOutFail {
    status: number;
    result: boolean;
    code?: number;
    message?: string;
}

@Route("v1/user")
export class UserController extends Controller {
    /**
     * Checkin
     */
    @Example<CheckInResponse>({
        status: httpStatus.OK,
        result: true,
        code: apiStatus.CONFLICT,
        payload: {
            card_no: 10,
            state: 'checkIn',
            prev_state: 'checkOut',
            notice: false
        }
    })
    @Response<CheckInResponse>(200, 'OK',{
        status: httpStatus.OK,
        result: true,
        code: apiStatus.OK,
        payload: {
            card_no: 10,
            state: 'checkIn',
            prev_state: 'checkOut',
            notice: false
        }
    })
    @Response<CheckInResponse>(401, 'Unauthorized', {
        status: httpStatus.UNAUTHORIZED,
        code: apiStatus.UNAUTHORIZED,
        message: "Unauthorized",
        result: false,
    })
    @Response<CheckInResponse>(406, 'Not Acceptable', {
        code: apiStatus.NOT_ACCEPTABLE,
        message: "Not Acceptable",
        result: false,
        status: httpStatus.NOT_ACCEPTABLE
    })
    @Response<CheckInResponse>(500, 'Internal Server Error', {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        code: apiStatus.INTERNAL_SERVER_ERROR,
        message: "Internal Server Error",
        result: false,
    })
    /**
     * @param cardId The card number
     * @example cardId "1"
     * @example cardId "1024"
     */
    @Security('api_key')
    @Post("/checkIn/{cardId}")
    public async checkIn(
        @Path() cardId: number,
        @Request() req: express.Request,
    ): Promise<CheckInResponse> {
        try {
            let userId = req.user?.jwt?._id;
            if (userId === undefined) {
                let msg = `사용자 정보 오류 ${userId}`;
                errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, msg, {stack:new Error().stack, isFatal: true}), req, req.res, null);
            }

            const result = await userService.checkIn(userId, cardId);
            logger.res(httpStatus.OK, result);
            this.setStatus(httpStatus.OK);
            return result;
        } catch (e) {
            logger.error(e);
            const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
            this.setStatus(statusCode);
            errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, req.res, null);
        }

        return {
            status: httpStatus.INTERNAL_SERVER_ERROR,
            result: false,
            code: apiStatus.INTERNAL_SERVER_ERROR,
            message: 'INTERNAL_SERVER_ERROR'
        };
    }

    @Security('api_key')
    @Post("/checkOut")
    public async checkOut(@Request() req: express.Request): Promise<CheckOutResponse> {
        let userId = req.user?.jwt?._id;
        if (userId === undefined) {
            let msg = `사용자 정보 오류 ${userId}`;
            errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, msg,
                {stack:new Error().stack, isFatal: true}), req, req.res, null);
            return {
                status: httpStatus.INTERNAL_SERVER_ERROR,
                result: false,
                code: apiStatus.INTERNAL_SERVER_ERROR,
                message: 'INTERNAL_SERVER_ERROR'
            };
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
                {stack:e.stack, isFatal: true}), req, req.res, null);
        }

        return {
            status: httpStatus.INTERNAL_SERVER_ERROR,
            result: false,
            code: apiStatus.INTERNAL_SERVER_ERROR,
            message: 'INTERNAL_SERVER_ERROR'
        };
    }

    /**
     * 유저 상태조회
     */
    @Security('api_key')
    @Get('/status')
    public async status (@Request() req: express.Request): Promise<UserStatusResponse> {
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
            errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, req.res, null);
        }
    };
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

export async function CheckIn(req: express.Request, res: express.Response, next) {
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

export async function CheckOut(req: express.Request, res: express.Response, next) {
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

export async function Status(req: express.Request, res: express.Response, next) {
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