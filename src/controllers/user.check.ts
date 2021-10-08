import { Request, Response, NextFunction } from 'express';
import * as userService from '@service/user.service';
import { errorHandler} from '@modules/error';
import httpStatus from 'http-status';
import logger from '@modules/logger';
import ApiError from "@modules/api.error";

/**
 * 카드 체크인
 */
export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.query?.from, req.query?.to);
        const body = await userService.checkIn(req.user.jwt, req.params.cardid);
        logger.info(body);
        logger.res({ res: body, statusCode: httpStatus.OK });
        res.status(httpStatus.OK).json(body);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }

};

/**
 * 카드 체크아웃
 */
export const checkOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.query?.from, req.query?.to);
        const body = await userService.checkOut(req.user.jwt);
        logger.info(body);
        logger.res({ res: body, statusCode: httpStatus.OK});
        res.status(httpStatus.OK).json(body);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};
