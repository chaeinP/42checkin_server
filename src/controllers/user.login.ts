import { Request, Response, NextFunction } from 'express';
import env from '@modules/env';
import * as authService from '@service/auth.service';
import { errorHandler} from '@modules/error';
import httpStatus from 'http-status';
import ApiError from '@modules/api.error';
import logger from "@modules/logger";

export const login = async (req: Request, res: Response, next: NextFunction) => {
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
export const callback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.user?.ft);
        const { token, cookieOption } = await authService.getAuth(req.user?.ft);
        res.cookie(env.cookie.auth, token, cookieOption);
        res.clearCookie('redirect');
        if(req.cookies.redirect) {
            res.status(httpStatus.FOUND).redirect(req.cookies.redirect);
        } else {
            res.status(httpStatus.FOUND).redirect(env.url.client + '/checkin');
        }
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};