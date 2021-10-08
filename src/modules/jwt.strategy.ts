import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import env from '@modules/env';
import jwt from 'jsonwebtoken';
import logger from '@modules/logger';
import { Users } from '@models/users';
import context from 'express-http-context';

const opts: StrategyOptions = {
	jwtFromRequest: ExtractJwt.fromExtractors([
		function JwtExtractor(req: Request) {
            logger.log('env.cookie.auth:', env.cookie.auth, ', req.cookies:', JSON.stringify(req.cookies), ', ret:', req.cookies[env.cookie.auth]);
			return req.cookies[env.cookie.auth];
		}
	]),
	ignoreExpiration: false,
	secretOrKey: env.jwt.secret
};

const validate = (payload: any) => {
    logger.log('payload:', payload);
    context.set('login', payload?.username ? payload?.username : '');

	return { _id: payload.sub, name: payload.username };
};

const strategyCallback = (jwt_payload: { sub: any; username: any }, done: any) => {
    try {
        const user = validate(jwt_payload);
        if (user._id) {
            return done(null, { jwt: user });
        } else {
            return done(null, null);
        }
    } catch (e) {
        logger.error(e);
        return done(null, null);
    }
};

export const JwtStrategy = () => new Strategy(opts, strategyCallback);

export const generateToken = (user: Users): string => {
	try {
		const payload = {
			username: user.login,
			sub: user._id
		};
        context.set('login', user?.login);
		const token = jwt.sign(payload, env.jwt.secret, { expiresIn: '7d' });
        logger.log('token:', token, 'payload:', payload);
		return token;
	} catch (e) {
		logger.error(e);
		throw e;
	}
};

export interface IJwtUser {
	_id: number;
	name: string;
}
