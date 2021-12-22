import * as configService from '@service/config.service';
import logger from '@modules/logger';
import httpStatus from 'http-status';
import {Body, Controller, Get, Put, Query, Route} from 'tsoa';

export class ConfigDto {
    _id: number;
    actor: string;
    auth: string;
    begin_at: Date;
    checkin_at: number;
    checkout_at: number;
    close_at: number;
    created_at: Date;
    deleted_at: Date;
    end_at: Date;
    env: string;
    gaepo: number;
    open_at: number;
    seocho: number;
    updated_at: Date;
}

export class ConfigRequest {
    values: ConfigDto;
    date: string
}

@Route('config')
export class ConfigController extends Controller {
    /**
     * Retrieves the configuration of server.
     * @param query
     */
    @Get('/')
    public async getConfig(@Query() query?: any): Promise<ConfigDto> {
        return new Promise(async (resolve, reject) => {
            let payload;
            let { date } = query;
            try {
                this.setStatus(httpStatus.OK);
                logger.log('date:', date);
                payload = await configService.getConfig(date);
                logger.info(payload);
            } catch (e) {
                logger.error(e);
                reject(e)
            }

            resolve(payload);
        });
    }

    /**
     * Retrieves the configuration of server.
     * @param config
     * @param jwt
     */
    @Put('/')
    public async setConfig(@Body() config: ConfigRequest) {
        return new Promise(async (resolve, reject) => {
            let payload;
            try {
                this.setStatus(httpStatus.OK);
                payload = await configService.setConfig(config?.date, config?.values);
            } catch (e) {
                logger.error(e);
                reject(e)
            }

            resolve(payload);
        });
    }
}