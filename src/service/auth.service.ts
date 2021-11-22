import env from '../modules/env';

import jwt from 'jsonwebtoken';
import * as userService from './user.service';
import httpStatus from 'http-status';
import ApiError from '../modules/api.error';
import { Users } from '../models/users';
import logger from '../modules/logger';

export const getAuth = async (user: Users) => {
	if (!user) {
        logger.error('user:', user);
        let msg = '유저정보가 존재하지 않습니다.';
		throw new ApiError(httpStatus.UNAUTHORIZED, msg, {stack: new Error(msg).stack});
	}
	const token = await userService.login(user);
	const decoded = jwt.decode(token) as any;
	const cookieOption: { domain?: string; expires: any } = {
		expires: new Date(decoded.exp * 1000)
	};
	cookieOption.domain = env.url.root_host;
	return {
		token, cookieOption
	}
}
