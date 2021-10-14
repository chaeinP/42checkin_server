import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import logger from '@modules/logger';
import env from '@modules/env';
import ApiError from '@modules/api.error';
import {errorHandler} from '@modules/error';
import requestIp from "request-ip";

const ipFilter = (rules: Function[]) => async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = requestIp.getClientIp(req);

	if (rules.length === 0 || rules.some((rule) => rule(clientIp))) {
		next();
	} else {
        logger.log('Unauthorized IP', clientIp)
        let msg = `42Guest WiFi 접속 중에만 체크인이 가능합니다.\n☞ 현재 IP: ${clientIp}\n☞ 42Guest WiFi IP: ${env.ip.guest}`;
        errorHandler(new ApiError(httpStatus.NOT_FOUND, msg, {
            stack: new Error(msg).stack,
            isFatal: false,
            isNormal: true
        }), req, res, next);
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
        if (env.ip.filter) {
            rules.push(requestAdminPrivilege, isGuestWiFi);
        }
        return ipFilter(rules)(req, res, next);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};
