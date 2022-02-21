import * as express from "express";
import httpStatus from "http-status";
import { Body, Controller, Get, Put, Query, Route, Security, Tags, Example, Response } from "tsoa";
import * as configService from "@service/config.service";
import { IConfig } from '@models/config';
import { apiStatus } from '@modules/api.status';
import { errorHandler } from "@modules/error";
import logger from "@modules/logger";
import ApiError from "@modules/api.error";
import { ResJson, ErrorJson } from "@modules/response"
import env from '@modules/env';
import {getTimezoneDateTimeString} from '@modules/utils';


interface ConfigJson {
    _id?: number;
    env?: string;
    auth?: string;
    begin_at?: string;
    end_at?: string;
    open_at?: string;
    close_at?: string;
    checkin_at?: string;
    checkout_at?: string;
    seocho?: number;
    gaepo?: number;
    actor?: string;
    deleted_at?: Date;
    updated_at?: string;
    created_at?: string;
    _comment?: number;
}

interface ConfigUpdate {
    gaepo?: number;
    seocho?: number;
    begin_at?: Date;
    end_at?: Date;
    open_at?: number;
    close_at?: number;
    auth?: string;
}

/**
 * @example
 * {
 *     "values": {
 *          "end_at": "2022-02-06",
 *          "open_at" : "08:00:00",
 *          "close_at" : "22:00:00",
 *          "seocho":300,
 *          "gaepo": 400
 *      },
 *      "date": "2022-01-25"
 * }
 */

export class ConfigRequest {
    env?: ConfigUpdate;
    values?: ConfigUpdate;
    date: string;
}

@Route("v1/config")
@Tags("Config")
export class ConfigController extends Controller {
    /**
     * 클러스터 설정 값 조회
     * @param date
     * @example date "2022-01-25"
     */
    @Example<ResJson<ConfigJson>>({
        status: 200,
        code: 2000,
        result: true,
        payload:{
            _id: 1,
            env: "production",
            auth: "42",
            begin_at: "2021-12-31T15:00:00.000Z",
            end_at: "2022-02-20T00:00:00.000Z",
            open_at: "08:00:00",
            close_at: "22:00:00",
            checkin_at: "08:00:00",
            checkout_at: "22:00:00",
            seocho: 200,
            gaepo: 300,
            actor: "chaepark",
            deleted_at: null,
            updated_at: "2022-01-25T08:24:28.376Z",
            created_at: "2021-12-31T15:00:00.000Z",
            "_comment": 1
        }
    })

    @Example<ResJson<null>>({
        status: 200, /* OK */
        code: 4040, /* NOT_FOUND */
        result: false,
        message: "[production] 해당 날짜(2022-01-31)의 설정값이 서버에 존재하지 않습니다."
    })

    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500, /* INTERNAL_SERVER_ERROR */
        code: 5000, /* INTERNAL_SERVER_ERROR */
        result: false,
        message: "서버 오류입니다.\n잠시 후 재시도하시거나,\n증상이 계속되면 관리자(slack:@ohjongin)에게 문의하세요."
    })
    @Get("/")
    public async getConfig(@Query() date?: string): Promise<ResJson<IConfig>> {
        let response: ResJson<IConfig>;
        const node_env = env.node_env ? env.node_env : 'development';

        if (!date) {
            date = getTimezoneDateTimeString(new Date()).slice(0,10);
            logger.log(`Date is empty... Use today: ${date}`);
        }

        this.setStatus(httpStatus.OK);
        let payload = await configService.getConfigByDate(date);

        if (!payload)
            response = new ResJson<IConfig>(httpStatus.OK, apiStatus.NOT_FOUND, false, `[${node_env}] 해당 날짜(${date})의 설정값이 서버에 존재하지 않습니다.`, null);
        else response = new ResJson<IConfig>(httpStatus.OK, apiStatus.OK, true, null, payload);

        return response;
    }

    /**
     * 클러스터 설정 값 수정
     * @param config
     * @param jwt
     */
     @Example<ResJson<ConfigJson>>({
        status: 200,
        code: 200,
        result: true,
        payload : {
            _id: 1,
            env: "local",
            auth: "Slack",
            begin_at: "2022-01-24T00:00:00.000Z",
            end_at: "2022-02-06T00:00:00.000Z",
            open_at: "09:00:00",
            close_at: "21:00:00",
            checkin_at: "09:00:00",
            checkout_at: "22:00:00",
            seocho: 300,
            gaepo: 400,
            actor: "chaepark",
            deleted_at: null,
            updated_at: "2022-01-27T05:37:14.064Z",
            created_at: "2021-12-31T15:00:00.000Z",
            _comment: 1
        }
    })

    @Example<ResJson<null>>({
        status: 200, /* OK */
        code: 4040, /* NOT_FOUND */
        result: false,
        message: "[production] 해당 날짜(2022-01-31)의 설정값이 서버에 존재하지 않습니다."
    })

    @Response<ErrorJson>(400, "Bad Request", {
        status: 400,
        code: 4000,
        result: false,
        message: "업데이트 할 설정 값이 올바르지 않습니다. - production",
    })

    @Response<ErrorJson>(500, "Internal Server Error", {
        status: 500, /* INTERNAL_SERVER_ERROR */
        code: 5000, /* INTERNAL_SERVER_ERROR */
        result: false,
        message: "서버 오류입니다.\n잠시 후 재시도하시거나,\n증상이 계속되면 관리자(slack:@ohjongin)에게 문의하세요."
    })
    @Security("CookieAuth")
    @Put("/")
    public async setConfig(
        @Body() config: ConfigRequest
    ): Promise<ResJson<IConfig>> {
        let payload: IConfig;
        let response: ResJson<IConfig>;
        const node_env = env.node_env ? env.node_env : 'development';

        // 규격 변경으로 인한 하위 호환성 확보를 위한 방어코드
        if (config && !config.values && config.env) {
            config.values = config.env;
        }

        let date = config?.date;
        if (!config.date) {
            date = getTimezoneDateTimeString(new Date()).slice(0,10);
            logger.log(`Date is empty... Use today: ${date}`);
        }
        payload = await configService.setConfigByDate(date, config?.values);
        this.setStatus(httpStatus.OK);
        if (!payload)
            response = new ResJson<null>(httpStatus.OK, apiStatus.NOT_FOUND, false, `[${node_env}] 해당 날짜(${date})의 설정값이 서버에 존재하지 않습니다.`, null)
        else response = new ResJson<IConfig>(httpStatus.OK, apiStatus.OK, false, null, payload);

        return response;
    }
}

export const getConfig = async ( req: express.Request, res: express.Response, next: express.NextFunction) => {
    let statusCode: number;
    try {
        const controller = new ConfigController();
        const { date } = req?.query as { date: string };
        const response = await controller.getConfig(date);
        statusCode = controller.getStatus();

        logger.res(statusCode, response);
        return res.status(statusCode).send(response);
    } catch (e) {
        logger.error(e);
        statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack: e.stack, isFatal: true}), req, res, next);
    }
}

export const setConfig = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let statusCode: number;

    try {
        const controller = new ConfigController();
        const response = await controller.setConfig(req.body);
        statusCode = controller.getStatus();

        logger.res(httpStatus.OK, response);
        return res.status(statusCode).send(response);
    } catch (e) {
        logger.error(e);
        statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, {stack: e.stack, isFatal: true}), req, res, next);
    }
}
