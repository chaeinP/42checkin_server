import { Request, Response, NextFunction } from 'express';
import env from '@modules/env';
import * as authService from '@service/auth.service';
import { catchAsync } from '@modules/error';

/**
 * 42API 로그인 후 리다이렉트 되는 엔드포인트입니다.
 * 42API에서 유저 정보를 가져와 JWT 토큰을 발행합니다.
 * JWT토큰을 쿠키에 w_auth로 담아 전송합니다.
 * /checkin 페이지로 리다이렉트 합니다.
 * @param req
 * @param res
 * @param next
 */
export const callback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	const { token, cookieOption } = await authService.getAuth(req.user.ft);
	res.cookie(env.cookie.auth, token, cookieOption);
	res.status(302).redirect(env.url.client + '/checkin');
});
