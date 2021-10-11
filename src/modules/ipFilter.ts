import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import logger from '@modules/logger';
import env from '@modules/env';
import ApiError from '@modules/api.error';
import {errorHandler} from '@modules/error';

const ipFilter = (rules: Function[]) => async (req: Request, res: Response, next: NextFunction) => {
	const { clientIp } = req;

	if (rules.length === 0 || rules.some((rule) => rule(clientIp))) {
		next();
	} else {
        const response: { code: number, message: string, stack: string } = {
            code: httpStatus.NETWORK_AUTHENTICATION_REQUIRED,
            message: `42Guest WiFi 접속 중에만 체크인이 가능합니다.\n현재 IP: ${clientIp}\n42Guest WiFi: 121.135.181.61`,
            stack: ''
        };

        logger.log('Unauthorized IP', clientIp)
        logger.info(response);
        logger.res(httpStatus.OK, response);
        res.json(response).status(httpStatus.OK);
	}
};

const requestAdminPrivilege = (ip: string) => {
	const ips = [ env.ip.developer01, env.ip.developer02 ];
	return ips.includes(ip);
};

const isGuestWiFi = (ip: string) => {
	const ips = [ env.ip.guest ];
	return ips.includes(ip);
};

export const GuestWiFiIpFilter = (req: Request, res: Response, next: NextFunction) => {
    try {
        const rules: Function[] = [];
        if (env.node_env === 'production') {
            rules.push(requestAdminPrivilege, isGuestWiFi);
        }
        return ipFilter(rules)(req, res, next);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};
