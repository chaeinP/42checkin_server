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
import axios from "axios";

export const path = '/user';
export const router = Router();

const passportOptions = { failureRedirect: env.url.client + '/' };

passport.use(StrategyJwt());
passport.use(Strategy42());
passport.use(StrategySlack());

router.get('/login/', Login.login, async function login(req, res, next) {
    let strategy = '42';
    try {
        let start = new Date().getTime();
        let ret = await axios.head('http://intra.42.fr');
        let end = new Date().getTime();

        logger.log('duration: ', (end - start) / 1000);
        if (ret.status !== 200) {
            strategy = 'Slack';
        }
    } catch (e) {
        logger.error(e);
    }

    passport.authenticate(strategy, function onPassportAuthCallback (err, user, info) {
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
router.get('/login/callback/slack', passport.authenticate('Slack', passportOptions), Login.callback);
// router.get('/login/callback/slack', async function callback(req, res, next) {
//     passport.authenticate('Slack', function onPassportAuthCallback (err, user, info) {
//         logger.log(err, user, info);
//         if (err) {
//             return next(err);
//         }
//         if (!user) {
//             return res.redirect(env.url.client + '/')
//         }
//         req.user = user;
//
//         next();
//     })(req, res, next);
// }, Login.callback);
router.post('/checkIn/:cardid', GuestWiFiIpFilter, passport.authenticate('jwt'), Check.checkIn);
router.post('/checkOut', passport.authenticate('jwt'), Check.checkOut);
router.get('/status', passport.authenticate('jwt'), Status.userStatus);
router.get('/using', Status.usingStatus);
router.get('/usage', passport.authenticate('jwt'), Status.userUsageList);
router.get('/usage/daily', passport.authenticate('jwt'), Status.userUsageDaily);
router.post('/forceCheckout/:userId', passport.authenticate('jwt'), Status.forceCheckout);