import { apiStatus } from './../../modules/api.status';
import { ResJson, ErrorJson } from './../../modules/response';
import * as express from 'express';
import * as historyService from '@service/history.service';
import { CLUSTER_CODE } from '@modules/cluster';
import logger from '@modules/logger';
import httpStatus from 'http-status';
import ApiError from "@modules/api.error";
import {errorHandler} from "@modules/error";
import { Controller, Request, Route, Tags, Example, Response, Security, Get, Path, Query, Body } from 'tsoa';

interface user {
    _id: number,
    state: string,
    login: string,
    card_no: number,
    log_id: number
}

interface card {
    _id: number,
    login: string,
    type: string,
    card_no: number,
    actor?: string,
    created_at: Date| string,
    updated_at?: Date,
    deleted_at?: Date,
    User : user,
}

interface cardHistory {
    list: card[],
    lastPage: number
}

interface checkIn {
    _id: number,
    created_at: string,
    state: string,
    login: string,
    card_no: number,
    log_id: number
}

interface checkInHistory {
    list: checkIn[],
    lastPage: number
}

@Route("v1/log")
@Tags("History")
export class HistoryController extends Controller {

    /**
     * 카드 히스토리 조회
     * @param cardId
     * @example cardId "25"
     * @param page
     * @example page "1"
     * @param listSize
     * @example listSize "2"
     */
    @Example<ResJson<cardHistory>>({
        status: 200,
        code: 2000,
        result: true,
        payload: {
            list: [
                {
                    _id: 13,
                    login: "chaepark",
                    type: "checkIn",
                    card_no: 25,
                    actor: null,
                    deleted_at: null,
                    updated_at: null,
                    created_at: "2022-02-09T11:46:44.000Z",
                    User: {
                        state: "checkIn",
                        _id: 1,
                        login: "chaepark",
                        card_no: 25,
                        log_id: 13
                    }
                },
                {
                    _id: 12,
                    login: "chaepark",
                    type: "checkOut",
                    card_no: 25,
                    actor: null,
                    deleted_at: null,
                    updated_at: null,
                    created_at: "2022-02-08T04:18:03.000Z",
                    User: {
                        _id: 1,
                        state: "checkIn",
                        login: "chaepark",
                        card_no: 25,
                        log_id: 13
                    }
                },
            ],
            lastPage: 3
        }
    })
    @Example<ResJson<cardHistory>>({
        status: 200,
        code: 4040,
        result: false,
        message: "card Id에 해당하는 정보가 없습니다.",
        payload: {
            list: [],
            lastPage: 3,
        },
    })
    @Response<ErrorJson>(400, "Bad_Request", {
        status: 400,
        code: 4000,
        message: "쿼리 정보 없음",
        result: false,
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(403, "Forbidden", {
        status: 403,
        code: 4030,
        result: false,
        message: "접근 권한이 없습니다."
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/card/{cardId}")
    public async getCardHistory(@Path() cardId:number, @Query() page:number, @Query() listSize: number){
        const payload = await historyService.getCardHistory(cardId, page, listSize);
        logger.info(payload);

        this.setStatus(httpStatus.OK);
        if (!payload.list.length)
            return new ResJson(httpStatus.OK, apiStatus.NOT_FOUND, false, "card Id에 해당하는 정보가 없습니다.", payload);
        return new ResJson(httpStatus.OK, apiStatus.OK, true, null, payload);
    }

    /**
     * 유저 히스토리 조회
     * @param login
     * @example login "chaepark"
     * @param page
     * @example page "1"
     * @param listSize
     * @example listSize "2"
     */
    @Example<ResJson<cardHistory>>({
        status: 200,
        code: 2000,
        result: true,
        payload: {
            list: [
                {
                    _id: 13,
                    login: "chaepark",
                    type: "checkIn",
                    card_no: 25,
                    actor: null,
                    deleted_at: null,
                    updated_at: null,
                    created_at: "2022-02-09T11:46:44.000Z",
                    User: {
                        state: "checkIn",
                        _id: 1,
                        login: "chaepark",
                        card_no: 25,
                        log_id: 13
                    }
                },
                {
                    _id: 12,
                    login: "chaepark",
                    type: "checkOut",
                    card_no: 25,
                    actor: null,
                    deleted_at: null,
                    updated_at: null,
                    created_at: "2022-02-08T04:18:03.000Z",
                    User: {
                        state: "checkIn",
                        _id: 1,
                        login: "chaepark",
                        card_no: 25,
                        log_id: 13
                    }
                }
            ],
            lastPage: 7
        }
    })
    @Example<ResJson<cardHistory>>({
        status: 200,
        code: 4040,
        result: false,
        message: "login에 해당하는 정보가 없습니다.",
        payload: {
            list: [],
            lastPage: 3,
        },
    })
    @Response<ErrorJson>(400, "Bad_Request", {
        status: 400,
        code: 4000,
        message: "쿼리 정보 없음",
        result: false,
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(403, "Forbidden", {
        status: 403,
        code: 4030,
        result: false,
        message: "접근 권한이 없습니다."
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/user/{login}")
    public async getUserHistory(@Path() login:string, @Query() page:number, @Query() listSize:number){
        const payload = await historyService.getUserHistory(login, page, listSize);
        logger.info(payload);

        this.setStatus(httpStatus.OK);
        if (!payload.list.length)
            return new ResJson(httpStatus.OK, apiStatus.NOT_FOUND, false, "login에 해당하는 정보가 없습니다.", payload);
        return new ResJson(httpStatus.OK, apiStatus.OK, true, null, payload)
    }
    /**
     * 개포 클러스터 히스토리 조회
     * @param page
     * @example page "1"
     * @param listSize
     * @example listSize "2"
     */
     @Example<ResJson<cardHistory>>({
        status: 200,
        code: 2000,
        result: true,
        payload: {
            list: [
                {
                    _id: 13,
                    login: "chaepark",
                    type: "checkIn",
                    card_no: 25,
                    actor: null,
                    deleted_at: null,
                    updated_at: null,
                    created_at: "2022-02-09T11:46:44.000Z",
                    User: {
                        state: "checkIn",
                        _id: 1,
                        login: "chaepark",
                        card_no: 25,
                        log_id: 13
                    }
                },
                {
                    _id: 12,
                    login: "chaepark",
                    type: "checkOut",
                    card_no: 25,
                    actor: null,
                    deleted_at: null,
                    updated_at: null,
                    created_at: "2022-02-08T04:18:03.000Z",
                    User: {
                        _id: 1,
                        state: "checkIn",
                        login: "chaepark",
                        card_no: 25,
                        log_id: 13
                    }
                },
            ],
            lastPage: 3
        }
    })
    @Example<ResJson<cardHistory>>({
        status: 200,
        code: 4040,
        result: false,
        message: "gaepo에 해당하는 정보가 없습니다.",
        payload: {
            list: [],
            lastPage: 0,
        },
    })
    @Response<ErrorJson>(400, "Bad_Request", {
        status: 400,
        code: 4000,
        message: "쿼리 정보 없음",
        result: false,
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(403, "Forbidden", {
        status: 403,
        code: 4030,
        result: false,
        message: "접근 권한이 없습니다."
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/gaepo")
    public async getGaepoHistory(@Query() page:number, @Query() listSize:number){
        const payload = await historyService.getCluster(CLUSTER_CODE.gaepo, page, listSize);
        logger.info(payload);

        this.setStatus(httpStatus.OK);
        if (!payload.list.length)
            return new ResJson(httpStatus.OK, apiStatus.NOT_FOUND, false, "gaepo에 해당하는 정보가 없습니다.", payload);
        return new ResJson(httpStatus.OK, apiStatus.OK, true, null, payload);
    }

    /**
     * 서초 클러스터 히스토리 조회
     * @param page
     * @example page "1"
     * @param listSize
     * @example listSize "2"
     */
    @Example<ResJson<cardHistory>>({
        status: 200,
        code: 2000,
        result: true,
        payload: {
            list: [
                {
                    _id: 18,
                    login: "chaepark",
                    type: "checkOut",
                    card_no: 1059,
                    actor: null,
                    deleted_at: null,
                    updated_at: null,
                    created_at: "2022-02-20T05:07:48.000Z",
                    User: {
                        state: "checkOut",
                        _id: 1,
                        login: "chaepark",
                        card_no: null,
                        log_id: 18
                    }
                },
                {
                    _id: 17,
                    login: "chaepark",
                    type: "checkIn",
                    card_no: 1059,
                    actor: null,
                    deleted_at: null,
                    updated_at: null,
                    created_at: "2022-02-20T05:07:44.000Z",
                    User: {
                        state: "checkOut",
                        _id: 1,
                        login: "chaepark",
                        card_no: null,
                        log_id: 18
                    }
                }
            ],
            lastPage: 2
        }
    })
    @Example<ResJson<cardHistory>>({
        status: 200,
        code: 4040,
        result: false,
        message: "seocho에 해당하는 정보가 없습니다.",
        payload: {
            list: [],
            lastPage: 0,
        },
    })
    @Response<ErrorJson>(400, "Bad_Request", {
        status: 400,
        code: 4000,
        message: "쿼리 정보 없음",
        result: false,
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(403, "Forbidden", {
        status: 403,
        code: 4030,
        result: false,
        message: "접근 권한이 없습니다."
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/seocho")
    public async getSeochoHistory(@Query() page:number, @Query() listSize:number){
        const payload = await historyService.getCluster(CLUSTER_CODE.seocho, page, listSize);
        logger.info(payload);

        this.setStatus(httpStatus.OK);
        if (!payload.list.length)
            return new ResJson(httpStatus.OK, apiStatus.NOT_FOUND, false, "seocho에 해당하는 정보가 없습니다.", payload);
        return new ResJson(httpStatus.OK, apiStatus.OK, true, null, payload);
    }

    /**
     * 미반납 카드 조회 (type 0은 개포, 1은 서초)
     * @param type
     * @example type "0"
     * @example type "1"
     * @param page
     * @example page "1"
     * @param listSize
     * @example listSize "5"
     */
    @Example<ResJson<checkInHistory>>({
        status: 200,
        code: 2000,
        result: true,
        payload: {
            list: [
                {
                    _id: 1,
                    created_at: "2022-02-20T06:10:16.000Z",
                    state: "checkIn",
                    login: "chaepark",
                    card_no: 1059,
                    log_id: 19
                }
            ],
            lastPage: 1
        }
    })
    @Example<ResJson<checkInHistory>>({
        status: 200,
        code: 4040,
        result: false,
        message: "seocho에 checkIn 유저가 없습니다.",
        payload: {
            list: [],
            lastPage: 0
        }
    })
    @Response<ErrorJson>(400, "Bad_Request", {
        status: 400,
        code: 4000,
        message: "쿼리 정보 없음",
        result: false,
    })
    @Response<string>(401, "Unauthorized", "Unauthorized")
    @Response<ErrorJson>(403, "Forbidden", {
        status: 403,
        code: 4030,
        result: false,
        message: "접근 권한이 없습니다."
    })
    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500 /* INTERNAL_SERVER_ERROR */,
        code: 5000,
        message: "Internal Server Error",
        result: false,
    })
    @Security("CookieAuth")
    @Get("/CheckIn/{type}")
    public async getCheckInUsers(@Path() type:CLUSTER_CODE, @Query() page:number, @Query() listSize:number){
        const payload = await historyService.getCheckIn(type, page, listSize);
        logger.info(payload);
        this.setStatus(httpStatus.OK);
        if (!payload.list.length)
            return new ResJson(httpStatus.OK, apiStatus.NOT_FOUND, false, `현재 ${CLUSTER_CODE[type]}에 checkIn 유저가 없습니다.`, payload);
        return new ResJson(httpStatus.OK, apiStatus.OK, true, null, payload);
    }
}

export const GetCardHistory = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        logger.log('jwt:', req.user?.jwt, ', req.query:', JSON.stringify(req.query));
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page);
        const listSize = parseInt(req.query.listSize);
        if (isNaN(page) || isNaN(listSize))
            throw new ApiError(httpStatus.BAD_REQUEST, null, "쿼리 정보 없음")

        const controller = new HistoryController();
        const result = await controller.getCardHistory(id, page, listSize)
        const statusCode = controller.getStatus();
        logger.res(statusCode, result)
        res.status(statusCode).json(result);
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

export const GetUserHistory = async (req: express.Request, res: express.Response) => {
    try {
        logger.log('jwt:', req.user?.jwt, ', req.query:', JSON.stringify(req.query), ', req.params:', JSON.stringify(req.params));
        const login = req.params.login;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const listSize = parseInt(req.query.listSize);
        if (isNaN(page) || isNaN(listSize))
            throw new ApiError(httpStatus.BAD_REQUEST, null, '쿼리 정보 없음')

        const controller = new HistoryController();
        const result = await controller.getUserHistory(login, page, listSize);
        const statusCode = controller.getStatus();
        logger.res(statusCode, result)
        res.status(statusCode).json(result);
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
};

export const GetGaepoHistory = async (req: express.Request, res: express.Response) => {
    await getClusterHistory(req, res, CLUSTER_CODE.gaepo);
}

export const GetSeochoHistory = async (req: express.Request, res: express.Response) => {
    await getClusterHistory(req, res, CLUSTER_CODE.seocho);
}

export const GetCheckInUsers = async (req:express.Request, res: express.Response) => {
    try {
        logger.log('jwt:', req.user?.jwt, ', req.query:', JSON.stringify(req.query));
        const type = parseInt(req.params?.type);
        const page = parseInt(req.query?.page);
        const listSize = parseInt(req.query?.listSize);
        if (isNaN(type) || isNaN(page) || isNaN(listSize))
            throw new ApiError(httpStatus.BAD_REQUEST, null, '쿼리 정보 없음')

        const controller = new HistoryController();
        const result = await controller.getCheckInUsers(type, page, listSize);
        const statusCode = await controller.getStatus();
        logger.res(statusCode, result);
        res.status(statusCode).json(result);
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
}

const getClusterHistory = async (req: express.Request, res: express.Response, clusterType: CLUSTER_CODE) => {
    try {
        logger.log('jwt:', req.user?.jwt, ' clusterType:', clusterType, ', req.query:', JSON.stringify(req.query));
        const page = parseInt(req.query?.page);
        const listSize = parseInt(req.query?.listSize);
        if (isNaN(page) || isNaN(listSize))
            throw new ApiError(httpStatus.BAD_REQUEST, null, '쿼리 정보 없음')

        const controller = new HistoryController();
        const result = clusterType === CLUSTER_CODE.gaepo
            ? await controller.getGaepoHistory(page, listSize)
            : await controller.getSeochoHistory(page, listSize);
        const statusCode = await controller.getStatus();

        logger.res(statusCode, result);
        res.status(statusCode).send(result);
    } catch (e) {
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
}
