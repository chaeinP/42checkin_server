import { errorHandler } from '@modules/error';
import ApiError from '@modules/api.error';
import * as httpStatus from 'http-status';
import { apiStatus } from '@modules/api.status'
import { Request, Response, NextFunction } from "express";
import logger from "@modules/logger";
import * as userService from "@service/user.service";

export const adminCheck  = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.jwt._id;
        const user = await userService.getUserById(userId);

        console.log(apiStatus.FORBIDDEN)
        logger.log('isAdmin:', user?.type);
        if(!['admin'].includes(user?.type!))
            throw new ApiError(httpStatus.FORBIDDEN, apiStatus.FORBIDDEN, '접근 권한이 없습니다.')
        next();
    } catch (e) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};
