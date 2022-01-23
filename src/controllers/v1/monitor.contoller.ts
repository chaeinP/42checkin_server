import {Controller, Example, Get, Request, Response, Route, Security} from "tsoa";
import logger from "@modules/logger";
import {Database} from "@models/database";
import {exec} from 'child_process';
import passport from "passport";
import httpStatus from "http-status";
import appRootPath from "app-root-path";
import * as express from "express";
import {errorHandler} from "@modules/error";
import ApiError from "@modules/api.error";
import {apiStatus} from "@modules/api.status";

/**
 * User objects allow you to associate actions performed
 * in the system with the user that performed them.
 * The User object contains common information across
 * every user in the system regardless of status and role.
 */
export interface HealthResponse {
    status?: string;
    /**
     * Error message
     */
    message?: string;
    /**
     * The version number of server code
     */
    version?: string;
}

export interface DiskResponse {
    /**
     * Partition path
     */
    path?: string;
    filesystem?: string;
    size?: string;
    used?: string;
    avail?: string;
    percent?: string;
    error?: string;
}

export interface AuthResponse {
    /**
     * HTTP status code
     */
    status: number;
    /**
     * Checkin result is Success or Fail
     */
    result: boolean;
    /**
     * API Result code
     */
    code?: number;
    /**
     * Result message
     */
    message?: string;
    /**
     * Additional Data
     */
    payload?: {
        user_id?: number;
        login?: string;
    }
}

@Route("v1/monitor")
export class MonitorController extends Controller {
    /**
     * Check server status whether it is alive or not
     */
    @Example<HealthResponse>({
        status: "ok",
        message: "the server is healthy",
        version: "2.1.5"
    })
    @Get("health")
    public async getHealth(): Promise<HealthResponse> {
        let response: HealthResponse;
        try {
            await Database().authenticate();
            const pkg = require(appRootPath + '/package.json');
            response = {
                version: pkg?.version
            };
            this.setStatus(httpStatus.OK)
            logger.res(httpStatus.OK, response);
        } catch (e) {
            logger.error('Unable to connect to the database:', e);
            response = {
                status: 'fail',
                message: e.message
            }
            this.setStatus(httpStatus.INTERNAL_SERVER_ERROR)
        }

        return response;
    }

    @Get("disk")
    public async getDisk(): Promise<DiskResponse> {
        let diskInfo = {};
        try {
            exec("df -h", (error, stdout, stderr) => {
                if (error) {
                    diskInfo = {...diskInfo, error: error}
                    logger.error('error:', error);
                } else if (stderr) {
                    diskInfo = {...diskInfo, stderr: stderr}
                    logger.error('stderr:', stderr);
                } else {
                    let result = stdout.split('\n');
                    for (let item of result) {
                        let trimed = item.replace(/\s\s+/g, ' ');
                        let info = trimed.split(' ');
                        if (info?.length < 1) continue;

                        if (info[5] === '/') {
                            diskInfo = {
                                ...diskInfo,
                                path: info[5],
                                filesystem: info[0],
                                size: info[1],
                                used: info[2],
                                avail: info[3],
                                percent: info[4]
                            }
                            let percent = parseInt(info[4].replace('%', ''));
                        }
                    }
                    logger.log('stdout:', result);
                }

                this.setStatus(httpStatus.OK)
                logger.res(httpStatus.OK, diskInfo);
                return diskInfo;
            });
        } catch (e) {
            this.setStatus(httpStatus.INTERNAL_SERVER_ERROR)
            return {error: e};
        }

        return diskInfo;
    }

    @Response<AuthResponse>(200, 'OK',{
        status: 200,
        result: true,
        code: 2000,
        payload: {
            user_id: 42,
            login: 'born2code'
        }
    })
    @Response<AuthResponse>(401, 'Unauthorized', {
        status: 401,
        code: 4010,
        message: "Unauthorized",
        result: false,
    })
    @Security('api_key')
    @Get("/auth")
    public async auth(@Request() req: express.Request): Promise<AuthResponse> {
        const _self = this;
        this.setStatus(httpStatus.INTERNAL_SERVER_ERROR)

        return new Promise(((resolve, reject) => {
            passport.authenticate('jwt', function(err, user, info) {
                logger.log('err: ', err);
                logger.log('user: ', user);
                logger.log('info: ', info);

                if (err || !user) {
                    _self.setStatus(httpStatus.UNAUTHORIZED)
                    return resolve({
                        status: httpStatus['UNAUTHORIZED'],
                        message: err?.message || info?.message,
                        code: apiStatus['UNAUTHORIZED'],
                        result: false
                    })
                }

                _self.setStatus(httpStatus.OK)
                return resolve({
                    status: httpStatus['OK'],
                    code: apiStatus['OK'],
                    result: true,
                    payload: {
                        user_id: user?.jwt?._id,
                        login: user?.jwt?.name

                    }
                })
            })(req, req.res);
        }));
    }
}

export const authCheck = async (req, res, next) => {
    try {
        const controller = new MonitorController();
        const result = await controller.auth(req);

        res.status(controller.getStatus() || httpStatus.OK).json(result);
    } catch (e) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
}