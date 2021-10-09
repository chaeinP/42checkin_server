import { Router } from "express";

import * as userRouter from '@routes/user.routes'
import * as configRouter from '@routes/config.routes'
import * as historyRouter from '@routes/history.routes';
import {Sequelize} from "@models/database";
import logger from "@modules/logger";
import passport from "passport";
import httpStatus from 'http-status';

export const router = Router();
export const path = '';

router.use(userRouter.path, userRouter.router);
router.use(historyRouter.path, historyRouter.router);
router.use(configRouter.path, configRouter.router);
router.get('/healthCheck', (req, res, next) => {
    Sequelize().authenticate()
        .then(function SequelizeAuthCallback() {
            res.json({ status: 'ok' }).status(httpStatus.OK);
        })
        .catch(function SequelizeAuthCallback (err) {
            logger.error('Unable to connect to the database:', err);
            res.json({ status: 'fail', message: err.message }).status(httpStatus.INTERNAL_SERVER_ERROR);
        });
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
            if (info != undefined) payload = {...payload, info: info};
            if (pkg) payload = {...payload, version: pkg?.version};

            logger.res(payload);
            if (error) {
                res.status(401).send(payload);
            } else if (!user) {
                res.status(401).send(payload);
            } else {
                res.status(200).send(payload);
            }
        })(req, res);
    },
    // function to call once successfully authenticated
    function onAuthSuccess(req, res) {
        logger.res({ statusCode: 2000 });
        res.status(200).send({ statusCode: 2000 });
    });
