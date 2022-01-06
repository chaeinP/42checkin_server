import {Router} from "express";

import * as UserRouter from '@routes/v1/user.router'
import * as ConfigRouter from '@routes/v1/config.router'
import * as HistoryRouter from '@routes/v1/history.router';
import * as v1 from '@routes/v1/v1.router';

import passport from "passport";
import env from "@modules/env";
import StrategyJwt from "@modules/strategy.jwt";
import Strategy42 from "@modules/strategy.42";
import StrategySlack from "@modules/strategy.slack";
import {MonitorController} from "@controllers/v1/monitor.contoller";
import {login, callback} from "@controllers/v1/user.controller";

export const router = Router();
export const path = '';

const passportOptions = { failureRedirect: env.url.client + '/' };
const strategy = env.passport?.strategy ? env.passport?.strategy : '42';

passport.use(StrategyJwt());
passport.use(Strategy42());
passport.use(StrategySlack());

/**
 * API 하위 호환성 확보를 위한 중복 코드
 */
router.use(UserRouter.path, UserRouter.router);
router.use(HistoryRouter.path, HistoryRouter.router);
router.use(ConfigRouter.path, ConfigRouter.router);

/**
 * API version에 독립적인 Route path
 */
router.get('/healthCheck', new MonitorController().getHealth);
router.get('/user/login/', login, passport.authenticate(strategy, passportOptions));
router.get('/user/login/callback/42', passport.authenticate('42', passportOptions), callback);
router.get('/user/login/callback/slack', passport.authenticate('Slack', passportOptions), callback);

/* API v1 */
router.use(v1.path, v1.router);

