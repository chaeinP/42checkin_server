import {NextFunction, Request, Response, Router} from 'express';
import passport from 'passport';
import env from '@modules/env';
import * as Login from '@controllers/user.login';
import * as Status from '@controllers/user.status';
import * as Check from '@controllers/user.check';
import { GuestWiFiIpFilter } from '@modules/ipFilter';
import { JwtStrategy } from '@modules/jwt.strategy';
import Strategy42 from '@modules/ft.strategy';
import StrategySlack from "@modules/slack.strategy";
import logger from "@modules/logger";
import * as userService from "@service/user.service";
import httpStatus from "http-status";
import {errorHandler} from "@modules/error";
import ApiError from "@modules/api.error";

export const path = '/user';
export const router = Router();
const passportOptions = { failureRedirect: env.url.client + '/' };
passport.use(JwtStrategy());
passport.use(Strategy42());
passport.use(StrategySlack());

const loginCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        passport.authenticate('Slack', function onPassportAuthCallback (error, user, info) {
            // this will execute in any case, even if a passport strategy will find an error
            // log everything to console
            logger.log('error:', error === undefined ? 'undefined' : JSON.stringify(error));
            logger.log('user:', user === undefined ? 'undefined' : JSON.stringify(user));
            logger.log('info:', info === undefined ? 'undefined' : JSON.stringify(info));

            let payload = { };
            if (error != undefined) payload = {...payload, error: error};
            if (user != undefined) payload = {...payload, user: user};
            if (info != undefined) payload = {...payload, info: info};

            if (error) {
                logger.res(401, payload);
                res.status(401).send(payload);
            } else if (!user) {
                logger.res(401, payload);
                res.status(401).send(payload);
            } else {
                logger.res(200, payload);
                next(req);
            }
        })(req, res);
    } catch (e) {
        errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }
};

router.get('/login/', Login.login, passport.authenticate('Slack', passportOptions));
router.get('/login/callback', passport.authenticate('Slack', passportOptions), Login.callback);
//router.get('/login/callback', loginCallback, Login.callback);
router.post('/checkIn/:cardid', GuestWiFiIpFilter, passport.authenticate('jwt'), Check.checkIn);
router.post('/checkOut', passport.authenticate('jwt'), Check.checkOut);
router.get('/status', passport.authenticate('jwt'), Status.userStatus);
router.get('/using', Status.usingStatus);
router.get('/usage', passport.authenticate('jwt'), Status.userUsageList);
router.get('/usage/daily', passport.authenticate('jwt'), Status.userUsageDaily);
router.post('/forceCheckout/:userId', passport.authenticate('jwt'), Status.forceCheckout);