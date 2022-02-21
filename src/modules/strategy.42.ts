import env from '@modules/env';
import ApiError from './api.error';
import httpStatus from 'http-status';
import passport from 'passport';
import logger from '@modules/logger';
import { Users } from '@models/database';
import { now } from './utils';
import {Op} from "sequelize";

let FortyTwoStrategy = require('passport-42').Strategy;

const validate = async (token: string, rt: string, profile: any) => {
	try {
        if (profile._json.cursus_users.length < 2) {
            logger.error('profile:', profile);
            let msg = `접근할 수 없는 유저입니다. ${profile}`;
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, null, msg, {stack: new Error(msg).stack});
		} else {
            const user = new Users({
                login: profile.username,
                email: profile.emails[0].value,
                created_at: now().toDate(),
                type: 'cadet',
                access_token: token,
                refresh_token: rt,
                profile: profile,
            });

			return user;
		}
	} catch (e) {
		logger.error(e);
        return false;
	}
};

const strategeyCallback = (
	accessToken: any,
	refreshToken: any,
	profile: { id: any },
	callback: (arg0: any, arg1: any) => any
) => {
	validate(accessToken, refreshToken, profile)
		.then(async (user: Users) => {
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
            if (found) {
                if (user.email) found.email = user.email;
                if (user.profile) found.profile = user.profile;

                found.access_token = user.access_token;
                found.refresh_token = user.refresh_token;
                found.updated_at = new Date();

                await found.save();
            }

			callback(null, { ft: found ? found : user });
		})
		.catch((err) => {
			logger.error(err);
			callback(null, null);
		})
};

const Strategy42 = () =>
	new FortyTwoStrategy(
		{
			clientID: env.client.id,
			clientSecret: env.client.secret,
			callbackURL: env.client.callback,
			profileFields: {
				id: (obj: any) => String(obj.id),
				username: 'login',
				displayName: 'displayname',
				'name.familyName': 'last_name',
				'name.givenName': 'first_name',
				profileUrl: 'url',
				'emails.0.value': 'email',
				'phoneNumbers.0.value': 'phone',
				'photos.0.value': 'image_url'
			}
		},
		strategeyCallback
	);

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

export default Strategy42;
