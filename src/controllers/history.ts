import { Request, Response } from 'express';
import * as historyService from '../service/history.service';
import { CLUSTER_CODE } from '../modules/cluster';
import logger from '../modules/logger';
import httpStatus from 'http-status';
import ApiError from '../modules/api.error';
import {errorHandler} from '../modules/error';

const STATUS_OK = httpStatus.OK;
export const getUserHistory = async (req: Request<{ login: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    try {
        logger.log('jwt:', req.user?.jwt, ', req.query:', JSON.stringify(req.query));
        const login = req.params.login;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const listSize = parseInt(req.query.listSize);
        if (isNaN(page) || isNaN(listSize)) {
            res.status(httpStatus.BAD_REQUEST).send({login: login, page: page, listSize: listSize});
            return;
        }

        const body = await historyService.getUserHistory(login, page, listSize);
        logger.info(body);
        logger.res(STATUS_OK, body)
        res.json(body).status(STATUS_OK);
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        logger.error(e);
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
};

export const getCardHistory = async (req: Request<{ id: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    try {
        logger.log('jwt:', req.user?.jwt, ', req.query:', JSON.stringify(req.query));
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page);
        const listSize = parseInt(req.query.listSize);
        if (isNaN(page) || isNaN(listSize)) {
            res.status(httpStatus.BAD_REQUEST).send({id: id, page: page, listSize: listSize});
            return;
        }

        const body = await historyService.getCardHistory(id, page, listSize);
        logger.info(body);
        logger.res(STATUS_OK, body)
        res.json(body).status(STATUS_OK);
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        logger.error(e);
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
};

const getClusterHistory = async (req: Request<{ type: string }, {}, {}, { page: string, listSize: string }>, res: Response, clusterType: CLUSTER_CODE) => {
    try {
        logger.log('jwt:', req.user?.jwt, ' clusterType:', clusterType, ', req.query:', JSON.stringify(req.query));
        const page = parseInt(req.query?.page);
        const listSize = parseInt(req.query?.listSize);
        if (isNaN(page) || isNaN(listSize)) {
            res.status(httpStatus.BAD_REQUEST).send({clusterType: clusterType, page: page, listSize: listSize});
            return;
        }

        const body = await historyService.getCluster(clusterType, page, listSize);
        logger.info(JSON.stringify(body));
        logger.res(STATUS_OK, body)
        res.json(body).status(STATUS_OK);
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        logger.error(e);
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }

}
export const getGaepoHistory = async (req: Request<{ type: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    await getClusterHistory(req, res, CLUSTER_CODE.gaepo);
};

export const getSeochoHistory = async (req: Request<{ type: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    await getClusterHistory(req, res, CLUSTER_CODE.seocho);
};

export const getClusterCheckinUsers = async (req: Request<{ cluster: string }, {}, {}, { page: string, listSize: string }>, res: Response) => {
    try {
        logger.log('jwt:', req.user?.jwt, ', req.query:', JSON.stringify(req.query));
        const type = parseInt(req.params?.cluster);
        const page = parseInt(req.query?.page);
        const listSize = parseInt(req.query?.listSize);
        logger.log('type:', type, ', page:', page, ', listSize:', listSize);
        if (isNaN(type) || isNaN(page) || isNaN(listSize)) {
            res.status(httpStatus.BAD_REQUEST).send({type: type, page: page, listSize: listSize});
            return;
        }

        const body = await historyService.getClusterCheckinUsers(type, page, listSize);
        logger.info(body);
        logger.res(STATUS_OK, body)
        res.json(body).status(STATUS_OK);
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        logger.error(e);
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
};
