import { Request, Response, NextFunction } from 'express';
import * as historyService from '@service/history.service';
import { CLUSTER_CODE } from '@modules/cluster';
import logger from '@modules/logger';
import httpStatus from 'http-status';
import ApiError from "@modules/api.error";
import {errorHandler} from "@modules/error";

const STATUS_OK = httpStatus.OK;
export const getUserHistory = async (req: Request<{ login: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    try {
        logger.log(req.user.jwt, req.query.from, req.query.to);
        const login = req.params.login;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const listSize = parseInt(req.query.listSize);
        const body = await historyService.getUserHistory(login, page, listSize);
        logger.info(body);
        logger.res({ res: body, statusCode: STATUS_OK })
        res.json(body).status(STATUS_OK);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
};

export const getCardHistory = async (req: Request<{ id: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    try {
        logger.log(req.user?.jwt, req.query?.from, req.query?.to);
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page);
        const listSize = parseInt(req.query.listSize);
        const body = await historyService.getCardHistory(id, page, listSize);
        logger.info(body);
        logger.res({ res: body, statusCode: STATUS_OK })
        res.json(body).status(STATUS_OK);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
};

const getClusterHistory = async (req: Request<{ type: string }, {}, {}, { page: string, listSize: string }>, res: Response, clusterType: CLUSTER_CODE) => {
    try {
        logger.log(req.user?.jwt, req.query?.from, req.query?.to);
        const page = parseInt(req.query.page);
        const listSize = parseInt(req.query.listSize);
        const body = await historyService.getCluster(clusterType, page, listSize);
        logger.info(body);
        logger.res({ res: body, statusCode: STATUS_OK })
        res.json(body).status(STATUS_OK);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }

}
export const getGaepoHistory = async (req: Request<{ type: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    await getClusterHistory(req, res, CLUSTER_CODE.gaepo);
};

export const getSeochoHistory = async (req: Request<{ type: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    await getClusterHistory(req, res, CLUSTER_CODE.seocho);
};

export const getCheckInUsers = async (req: Request<{ type: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    try {
        logger.log(req.user?.jwt, req.query?.from, req.query?.to);
        const type = parseInt(req.params?.type);
        const page = parseInt(req.query?.page);
        const listSize = parseInt(req.query?.listSize);
        logger.log('type:', type, ', page:', page, ', listSize:', listSize);
        if (!page || !listSize) {
            throw new Error(`Invalid Parameters !! type:${type}, page:${page}, listSize:${listSize}`);
        }

        const body = await historyService.getCheckIn(type, page, listSize);
        logger.info(body);
        logger.res({ res: body, statusCode: STATUS_OK })
        res.json(body).status(STATUS_OK);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
};
