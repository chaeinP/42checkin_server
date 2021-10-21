import {Router} from "express";

import * as userRouter from '@routes/user.routes'
import * as configRouter from '@routes/config.routes'
import * as historyRouter from '@routes/history.routes';
import logger from "@modules/logger";
import passport from "passport";
import {CheckController} from "@controllers/check.contoller";

export const router = Router();
export const path = '';

router.use(userRouter.path, userRouter.router);
router.use(historyRouter.path, historyRouter.router);
router.use(configRouter.path, configRouter.router);

router.get('/check/health', async function healthCheck(req, res, next) {
    const controller = new CheckController();
    const response = await controller.getHealth();
    return res.status(<number>controller.getStatus()).send(response);
})

router.get('/check/disk', async function diskCheck(req, res, next) {
    const controller = new CheckController();
    const response = await controller.getDisk();
    return res.status(<number>controller.getStatus()).send(response);
})

router.get('/authCheck',
    function routerInfoCallback(req, res, next) {
        passport.authenticate('jwt', function onPassportAuthCallback (error, user, info) {
            const pkg = require('../../package.json');

            // this will execute in any case, even if a passport strategy will find an error
            // log everything to console
            logger.log('error:', error === undefined ? 'undefined' : JSON.stringify(error));
            logger.log('user:', user === undefined ? 'undefined' : JSON.stringify(user));
            logger.log('info:', info === undefined ? 'undefined' : JSON.stringify(info));

            let payload = { };
            if (error != undefined) payload = {...payload, error: error};
            if (user != undefined) payload = {...payload, user: user};
            if (info != undefined) payload = {...payload, info: JSON.stringify(info)};
            if (pkg) payload = {...payload, version: pkg?.version};

            if (error) {
                logger.res(401, payload);
                res.status(401).send(payload);
            } else if (!user) {
                logger.res(401, payload);
                res.status(401).send(payload);
            } else {
                logger.res(200, payload);
                res.status(200).send(payload);
            }
        })(req, res);
    },
    // function to call once successfully authenticated
    function onAuthSuccess(req, res) {
        logger.res(200, { statusCode: 2000 });
        res.status(200).send({ statusCode: 2000 });
    });
