import {Router} from 'express';
import passport from 'passport';
import env from '@modules/env';
import * as Login from '@controllers/user.login';
import * as Status from '@controllers/user.status';
import * as Check from '@controllers/user.check';
import {GuestWiFiIpFilter} from '@modules/ip.filter';
import StrategyJwt from '@modules/strategy.jwt';
import Strategy42 from '@modules/strategy.42';
import StrategySlack from "@modules/strategy.slack";
import logger from "@modules/logger";
import {getTimezoneDate} from "@modules/util";
import * as configService from "@service/config.service";

export const path = '/user';
export const router = Router();

const passportOptions = { failureRedirect: env.url.client + '/' };

passport.use(StrategyJwt());
passport.use(Strategy42());
passport.use(StrategySlack());

router.get('/login/', Login.login, async function login42(req, res, next) {
    const today = getTimezoneDate(new Date()).toISOString().slice(0, 10)
    const config = await configService.getConfig(today);
    const strategy = config?.auth || '42';
    passport.authenticate(strategy, function onPassportLogin42 (err, user, info) {
        logger.log(err, user, info);
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect(env.url.client + '/')
        }
        next();
    })(req, res, next);
});
router.get('/login/callback/42', passport.authenticate('42', passportOptions), Login.callback);
router.get('/login/callback/slack', async function onLoginCallbackSlack(req, res, next) {
    passport.authenticate('Slack', function onPassportSlackAuthCallback (err, user, info) {
        logger.log(err, user, info);
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect(env.url.client + '/')
        }
        req.user = user;

        next();
    })(req, res, next);
}, Login.callback);
router.post('/checkIn/:cardid', passport.authenticate('jwt'), GuestWiFiIpFilter, Check.checkIn);
router.post('/checkOut', passport.authenticate('jwt'), Check.checkOut);
router.get('/status', passport.authenticate('jwt'), Status.userStatus);
router.get('/using', Status.usingStatus);
router.get('/usage', passport.authenticate('jwt'), Status.userUsageList);
router.get('/usage/daily', passport.authenticate('jwt'), Status.userUsageDaily);
router.post('/forceCheckout/:userId', passport.authenticate('jwt'), Status.forceCheckout);