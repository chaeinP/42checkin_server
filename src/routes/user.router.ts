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

export const path = '/user';
export const router = Router();

const passportOptions = { failureRedirect: env.url.client + '/' };
const strategy = env.passport?.strategy ? env.passport?.strategy : '42';

passport.use(StrategyJwt());
passport.use(Strategy42());
passport.use(StrategySlack());

router.get('/login/', Login.login, passport.authenticate(strategy, passportOptions));
router.get('/login/callback', passport.authenticate(strategy, passportOptions), Login.callback);
router.post('/checkIn/:cardid', passport.authenticate('jwt'), GuestWiFiIpFilter, Check.checkIn);
router.post('/checkOut', passport.authenticate('jwt'), Check.checkOut);
router.get('/status', passport.authenticate('jwt'), Status.userStatus);
router.get('/using', Status.usingStatus);
router.get('/usage', passport.authenticate('jwt'), Status.userUsageList);
router.get('/usage/daily', passport.authenticate('jwt'), Status.userUsageDaily);
router.post('/forceCheckout/:userId', passport.authenticate('jwt'), Status.forceCheckout);