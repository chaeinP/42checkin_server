import logger from '@modules/logger';
import * as userService from '@service/user.service';
import * as usageService from '@service/usage.service';
import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '@modules/error';
import httpStatus from 'http-status';

/**
 * 유저 상태조회
 */
export const userStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const body = await userService.status(req.user.jwt);
    logger.res({ body: JSON.stringify(body, null, 2), statusCode: httpStatus.OK });
    res.json(body).status(200);
});

export const usingStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	const body = await userService.getUsingInfo();
	logger.res({  body: JSON.stringify(body, null, 2), statusCode: httpStatus.OK });
	res.status(httpStatus.OK).json(body);
});

/**
 * 유저 체크인 사용시간 (일별통계)
 */
export const userUsageDaily = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const body = await usageService.getUsagesDaily(req.user.jwt, req.query.from, req.query.to);
    logger.res({ body: JSON.stringify(body, null, 2), statusCode: httpStatus.OK });
    res.json(body).status(200);
});

/**
 * 유저 체크인 사용시간 전체 목록
 */
export const userUsageList = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const body = await usageService.getUsagesList(req.user.jwt, req.query.from, req.query.to);
    logger.res({ body: JSON.stringify(body, null, 2), statusCode: httpStatus.OK });
    res.json(body).status(200);
});

/**
 * 강제 체크아웃
 */
export const forceCheckout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	const { userId } = req.params;
	const body = await userService.forceCheckOut(req.user.jwt, userId);
	logger.res({ body, statusCode: httpStatus.OK });
	res.status(httpStatus.OK).json({ result: !!body	});
});
