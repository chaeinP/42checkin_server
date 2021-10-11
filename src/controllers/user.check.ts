import { Request, Response, NextFunction } from 'express';
import * as userService from '@service/user.service';
import { errorHandler} from '@modules/error';
import httpStatus from 'http-status';
import logger from '@modules/logger';
import ApiError from "@modules/api.error";
import {getConfig} from "@service/config.service";
import {getTimeNumber, getTimezoneDateString} from "@modules/util";
import {getUser} from "@service/user.service";

const isBetween = (target: string, min: any, max: any) => {
    let now = getTimeNumber(target);
    let checkin_at = (min !== null && min !== undefined) ? getTimeNumber(min) : -1;
    let checkout_at = (max !== null && max !== undefined) ? getTimeNumber(max) : 10000;

    return (now >= checkin_at) && (now < checkout_at);
}

const checkAvailable = async (msg: string, req: Request, res: Response, next: NextFunction) => {
    logger.log(req.user?.jwt, req.params?.cardid);

    const user = await getUser(req.user?.jwt?._id);
    if (['admin'].includes(user.type)) return;

    // noinspection DuplicatedCode
    const today = getTimezoneDateString(new Date()).slice(0, 10)
    const config = await getConfig(today);
    if (!config) {
        let msg = `해당 날짜(${today})의 설정값이 서버에 존재하지 않습니다.`;
        logger.error(msg, 'date:', today, 'setting:', config);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, msg, {stack: new Error(msg).stack});
    }

    let now = (new Date().toISOString()).slice(11, 19);
    if (!isBetween(now, config.checkin_at, config.checkout_at)) {
        logger.log('now: ', now, ', checkin_at: ', config.checkin_at, ', checkout_at: ', config.checkout_at);
        let msg = '체크아웃 가능 시간이 아닙니다.';
        errorHandler(new ApiError(httpStatus.NOT_ACCEPTABLE, msg, {
            stack: new Error(msg).stack,
            isFatal: true
        }), req, res, next);
    }
}

/**
 * 카드 체크인
 */
export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.params?.cardid);

        await checkAvailable('체크인 가능 시간이 아닙니다.', req, res, next);
        const body = await userService.checkIn(req.user.jwt, req.params.cardid);
        logger.info(body);
        logger.res(httpStatus.OK, body);
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
        logger.log(req.user?.jwt);

        await checkAvailable('체크아웃 가능 시간이 아닙니다.', req, res, next);
        const body = await userService.checkOut(req.user.jwt);
        logger.info(body);
        logger.res(httpStatus.OK, body);
        res.status(httpStatus.OK).json(body);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};
