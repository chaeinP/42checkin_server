import ApiError from '@modules/api.error';
import logger from '@modules/logger';
import { sendErrorMessage } from '@modules/slack';
import { Request, Response, NextFunction } from 'express';
import env from '@modules/env';
import httpStatus from "http-status";
import tracer from 'cls-rtracer';

/**
 * 에러객체를 확인하고, 지정된 에러객체가 아니면 에러객체를 수정함
 */
export const errorConverter = (err: any, req: Request, res: Response, next: NextFunction) => {
	let error = err;
	if (!(err instanceof ApiError)) {
		const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
		const message = error.message || httpStatus[statusCode];
		error = new ApiError(statusCode, message, err.stack);
	}
	next(error);
};

/**
 * 에러내용을 응답함
 */
export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
    logger.error(err);
    let { statusCode, message } = err;
    let msg = message;

    if (statusCode == httpStatus.INTERNAL_SERVER_ERROR) {
        msg = '서버 오류입니다.\n잠시 후 재시도하시거나,\n증상이 계속되면 관리자(slack:@ohjongin)에게 문의하세요.'
    }

	const response: { code: number, message: string, stack: string } = {
		code: statusCode,
        message: msg,
        stack: ''
	};

	if (['development', 'devtest'].includes(env.node_env)) {
        response.stack = err.stack;
    }

    if (err.isFatal || !err.isNormal) {
        sendErrorMessage({
            ...logger.fatal(err),
            statusCode: err.statusCode || req.statusCode,
            uid: tracer.id()
        })
    }
    logger.log(response);
    logger.res(response);
	res.status(statusCode).send(response);
};