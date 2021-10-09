import logger from '@modules/logger';
import * as userService from '@service/user.service';
import * as usageService from '@service/usage.service';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '@modules/error';
import httpStatus from 'http-status';
import ApiError from "@modules/api.error";

/**
 * 유저 상태조회
 */
export const userStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt);
        const body = await userService.status(req.user.jwt);
        logger.info(body);
        logger.res(httpStatus.OK, body);
        res.json(body).status(httpStatus.OK);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

export const usingStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt);
        const body = await userService.getUsingInfo();
        logger.info(body);
        logger.res(httpStatus.OK, body);
        res.status(httpStatus.OK).json(body);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

/**
 * 유저 체크인 사용시간 (일별통계)
 */
export const userUsageDaily = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.query?.from, req.query?.to);
        const body = await usageService.getUsagesDaily(req.user.jwt, req.query.from, req.query.to);
        logger.info(body);
        logger.res(httpStatus.OK, body);
        res.json(body).status(httpStatus.OK);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

/**
 * 유저 체크인 사용시간 전체 목록
 */
export const userUsageList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.query?.from, req.query?.to);
        const body = await usageService.getUsagesList(req.user.jwt, req.query.from, req.query.to);
        logger.info(body);
        logger.res(httpStatus.OK, body);
        res.json(body).status(httpStatus.OK);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

/**
 * 강제 체크아웃
 */
export const forceCheckout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.params?.userId);
        const { userId } = req.params;
        const body = await userService.forceCheckOut(req.user.jwt, userId);
        logger.info(body);
        logger.res(httpStatus.OK, body);
        res.json(body).status(httpStatus.OK);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};
