import {Controller, Example, Get, Route} from "tsoa";
import logger from "@modules/logger";
import {Sequelize} from "@models/database";
import {exec} from 'child_process';
import httpStatus from "http-status";
import passport from "passport";
import {NextFunction} from "express";

/**
 * User objects allow you to associate actions performed
 * in the system with the user that performed them.
 * The User object contains common information across
 * every user in the system regardless of status and role.
 */
export interface IHealthStatus {
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

export interface IDiskStatus {
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

export interface IAuthStatus {
    error?: any;
    user: {
        jwt?: {
            _id: number,
            name?: string
        }
    };
    info?: any;
    version?: string;
}

@Route("check")
export class CheckController extends Controller {
    /**
     * Check server status whether it is alive or not
     */
    @Example<IHealthStatus>({
        status: "ok",
        message: "the server is healthy",
        version: "2.1.5"
    })
    @Get("/health")
    public async getHealth(): Promise<IHealthStatus> {
        this.setStatus(httpStatus.OK);
        return Sequelize().authenticate()
            .then(async function SequelizeAuthCallback() {
                const pkg = require('../../package.json');
                return {
                    version: pkg?.version
                };
            })
            .catch(function SequelizeAuthCallback(err) {
                logger.error('Unable to connect to the database:', err);
                return {
                    status: 'fail',
                    message: err.message
                };
            });
    }

    @Get("/disk")
    public async getDisk(): Promise<IDiskStatus> {
        this.setStatus(httpStatus.OK);
        let diskInfo = {};
        try {
            exec("df -h", (error, stdout, stderr) => {
                this.setStatus(httpStatus.OK);
                if (error) {
                    this.setStatus(httpStatus.INTERNAL_SERVER_ERROR);
                    diskInfo = {...diskInfo, error: error}
                    logger.error('error:', error);
                } else if (stderr) {
                    this.setStatus(httpStatus.INTERNAL_SERVER_ERROR);
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
                            this.setStatus(percent > 80 ? httpStatus.INSUFFICIENT_STORAGE : httpStatus.OK);
                        }
                    }
                    logger.log('stdout:', result);
                }

                return diskInfo;
            });
        } catch (e) {
            this.setStatus(httpStatus.INTERNAL_SERVER_ERROR);
            return {error: e};
        }

        return diskInfo;
    }

    public async authCheck(req, res, next): Promise<IAuthStatus> {
        const self = this;
        return new Promise((resolve, reject) => {
            passport.authenticate('jwt', function onPassportAuthCallback (error, user, info) {
                const pkg = require('../../package.json');

                // this will execute in any case, even if a passport strategy will find an error
                // log everything to console
                logger.log('error:', error === undefined ? 'undefined' : JSON.stringify(error));
                logger.log('user:', user === undefined ? 'undefined' : JSON.stringify(user));
                logger.log('info:', info === undefined ? 'undefined' : JSON.stringify(info));

                let payload: IAuthStatus;
                if (error != undefined) payload = {...payload, error: error};
                if (user != undefined) payload = {...payload, user: user};
                if (info != undefined) payload = {...payload, info: JSON.stringify(info)};
                if (pkg) payload = {...payload, version: pkg?.version};

                if (error || !user) {
                    logger.res(httpStatus.UNAUTHORIZED, payload);
                    self.setStatus(httpStatus.UNAUTHORIZED);
                } else {
                    logger.res(httpStatus.OK, payload);
                    self.setStatus(httpStatus.OK);
                }
                resolve(payload);
            })(req, res, next);
        });
    };
}