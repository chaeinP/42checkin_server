import config from '@config/configuration';
import User from '@entities/user.entity';

import jwt from 'jsonwebtoken';
import logger from '../lib/logger';

export default class AuthService {
	private static instance: AuthService;

	constructor() {
	}

	static get service() {
		if (!AuthService.instance) {
			AuthService.instance = new AuthService();
		}
		return AuthService.instance;
	}

	async generateToken(user: User): Promise<string> {
		try {
			logger.debug('generating token...');
			const payload = {
				username: user.getName(),
				sub: user.getId()
			};
			const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '7d' });
			logger.debug('new token generated : ', token);
			return token;
		} catch (e) {
			logger.error(e);
			throw e;
		}
	}
}
