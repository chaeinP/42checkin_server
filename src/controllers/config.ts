import * as configService from '@service/config.service';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '@modules/error';
import logger from '@modules/logger';
import httpStatus from 'http-status';
import ApiError from "@modules/api.error";
import {getTimeNumber, getTimezoneDateString} from "@modules/util";

export const getConfig = async (req: Request<{}, {}, {}, { date: string }>, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.query?.date);
        const body = await configService.getConfig(req.query.date);
        logger.info(body);
        logger.res(httpStatus.OK, body);
        res.status(httpStatus.OK).json(body)
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

export const setConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.log(req.user?.jwt, req.body);
        const body = await configService.setConfig(req.body);
        logger.info(body);
        logger.res(httpStatus.OK, body);
        res.status(httpStatus.OK).json(body)
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};
