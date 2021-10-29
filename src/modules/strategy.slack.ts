import env from '@modules/env';
import ApiError from './api.error';
import httpStatus from 'http-status';
import passport from 'passport';
import logger from '@modules/logger';
import { Users } from '@models/database';
import { now } from './util';
import {Op} from "sequelize";

const PassortStrategySlack = require('passport-slack-oauth2').Strategy;

// noinspection DuplicatedCode
const validate = async (token: string, refreshToken: string, profile: any) => {
	try {
        const user = new Users({
            login: profile.user.name,
            email: profile.user.email,
            created_at: now().toDate(),
            type: 'cadet',
            access_token: token,
            refresh_token: refreshToken,
            profile: profile,
        });

        return user;
	} catch (e) {
		logger.error(e);
        return null;
	}
};

// noinspection DuplicatedCode
const strategeyCallback = async (
    accessToken: any,
    refreshToken: any,
    profile: { id: any },
    callback: (arg0: any, arg1: any) => any
) => {
    logger.log(JSON.stringify(profile));

    try {
        let user = await validate(accessToken, refreshToken, profile);
        if (user) {
            logger.log('accessToken:', accessToken)
            logger.log('refreshToken:', refreshToken)

            const found = await Users.findOne({
                where: {
                    login: user.login,
                    deleted_at: {
                        [Op.eq]: null
                    }
                }
            });
            callback(null, {ft: found});
        }
    } catch (e) {
        logger.error(e);
        callback(null, null);

    }
};

const StrategySlack = () =>
	new PassortStrategySlack(
		{
			clientID: env.slack.oauth.client.id,
			clientSecret: env.slack.oauth.client.secret,
            skipUserProfile: false, // default
            scope: ['identity.basic']
            // scope: ['identity.basic', 'identity.email', 'identity.avatar', 'identity.team']
		},
		strategeyCallback
	);

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

export default StrategySlack;
