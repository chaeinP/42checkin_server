import { Router } from "express";

import * as userRouter from '@routes/user.routes'
import * as configRouter from '@routes/config.routes'
import * as historyRouter from '@routes/history.routes';
import {Sequelize} from "@models/database";
import logger from "@modules/logger";
import passport from "passport";
import app_root from "app-root-path";

export const router = Router();
export const path = '';

router.use(userRouter.path, userRouter.router);
router.use(historyRouter.path, historyRouter.router);
router.use(configRouter.path, configRouter.router);
router.get('/healthCheck', (req, res, next) => {
    Sequelize().authenticate()
        .then(function SequelizeAuthCallback() {
            res.send({ statusCode: 2000 })
        })
        .catch(function SequelizeAuthCallback (err) {
            logger.error('Unable to connect to the database:', err);
            res.send({ statusCode: 5000, message: err.message })
        });
})
router.get('/info',
    function routerInfoCallback(req, res, next) {
        passport.authenticate('jwt', function (error, user, info) {
            // this will execute in any case, even if a passport strategy will find an error
            // log everything to console
            logger.log(error);
            logger.log(user);
            logger.log(info);

            if (error) {
                res.status(401).send(error);
            } else if (!user) {
                res.status(401).send(info);
            } else {
                next();
            }
        })(req, res);
    },
    // function to call once successfully authenticated
    function onAuthSuccess(req, res) {
        const version = require(app_root + '/package.json').version
        res.status(200).send({ statusCode: 2000, version:  version});
    });
