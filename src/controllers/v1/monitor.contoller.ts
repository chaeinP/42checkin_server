import {Controller, Example, Get, Route} from "tsoa";
import logger from "@modules/logger";
import {Database} from "@models/database";
import {exec} from 'child_process';
import passport from "passport";
import httpStatus from "http-status";

/**
 * User objects allow you to associate actions performed
 * in the system with the user that performed them.
 * The User object contains common information across
 * every user in the system regardless of status and role.
 */
export interface IHealthResponse {
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

export interface IDiskResponse {
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

export interface IAuthResponse {
    version?: string;
    error?: string;
}

@Route("v1/monitor")
export class MonitorController extends Controller {
    /**
     * Check server status whether it is alive or not
     */
    @Example<IHealthResponse>({
        status: "ok",
        message: "the server is healthy",
        version: "2.1.5"
    })
    @Get("/health")
    public async getHealth(): Promise<IHealthResponse> {
        let response: IHealthResponse;
        try {
            await Database().authenticate();
            const pkg = require('../../package.json');
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

    @Get("/disk")
    public async getDisk(): Promise<IDiskResponse> {
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

    @Get("/auth")
    public async getAuth(): Promise<IAuthResponse> {
        let response: IAuthResponse;

        try {
            response = await passport.authenticate('jwt');
            const pkg = require('../../package.json');
            response['pkg'] = pkg?.version;
            logger.res(httpStatus.OK, response);
            this.setStatus(httpStatus.OK)
        } catch (e) {
            this.setStatus(httpStatus.INTERNAL_SERVER_ERROR)
            return {error: e.message};
        }

        return response;
    };
}