import * as configService from '@service/config.service';
import logger from '@modules/logger';
import httpStatus from 'http-status';
import {Body, Controller, Get, Put, Query, Route} from 'tsoa';
import {NextFunction, Request, Response} from "express";
import {errorHandler} from "@modules/error";
import ApiError from "@modules/api.error";

interface IConfig {
    _id: number;
    env?: string;
    auth?: string;
    begin_at?: Date;
    end_at?: Date;
    open_at?: number;
    close_at?: number;
    checkin_at?: number;
    checkout_at?: number;
    seocho?: number;
    gaepo?: number;
    actor?: string;
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;
}


export class ConfigRequest {
    env?: IConfig;
    values?: IConfig;
    date: string
}

@Route('v1/config')
export class ConfigController extends Controller {
    /**
     * Retrieves the configuration of server.
     * @param query
     */
    @Get('/')
    public async getConfig(@Query() query?: any): Promise<IConfig> {
        let payload;
        let { date } = query;
        try {
            this.setStatus(httpStatus.OK);
            logger.log('date:', date);
            payload = await configService.getConfigByDate(date);
            logger.res(httpStatus.OK, payload);
        } catch (e) {
            logger.error(e);
            payload = {};
            this.setStatus(httpStatus.INTERNAL_SERVER_ERROR);
        }

        return payload;
    }

    /**
     * Retrieves the configuration of server.
     * @param config
     * @param jwt
     */
    @Put('/')
    public async setConfig(@Body() config: ConfigRequest): Promise<IConfig> {
        let payload;
        try {
            // 규격 변경으로 인한 하위 호환성 확보를 위한 방어코드
            if (config && !config.values && config.env) {
                config.values = config.env;
            }

            this.setStatus(httpStatus.OK);
            payload = await configService.setConfigByDate(config?.date, config?.values);
            logger.res(httpStatus.OK, payload);
        } catch (e) {
            logger.error(e);
            payload = {};
            this.setStatus(httpStatus.INTERNAL_SERVER_ERROR);
        }

        return payload;
    }
}

export const getConfigRouter = async (req: Request, res: Response, next: NextFunction) => {
    const controller = new ConfigController();
    let response;
    let statusCode;

    try {
        response = await controller.getConfig(req?.query);
        statusCode = controller.getStatus();
    } catch (e) {
        statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }

    return res.status(statusCode).send(response);
}

export const setConfigRouter = async (req: Request, res: Response, next: NextFunction) => {
    const controller = new ConfigController();
    let response;
    let statusCode;

    try {
        response = await controller.setConfig(req.body);
        statusCode = controller.getStatus();
    } catch (e) {
        statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }

    return res.status(statusCode).send(response);
}