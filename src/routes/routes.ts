import {Router} from "express";

import * as userRouter from '@routes/user.routes'
import * as configRouter from '@routes/config.routes'
import * as historyRouter from '@routes/history.routes';
import {Sequelize} from "@models/database";
import logger from "@modules/logger";
import passport from "passport";
import httpStatus from 'http-status';

const os = require('os');
let diskPath = os.platform() === 'win32' ? 'c:' : '/';

export const router = Router();
export const path = '';

router.use(userRouter.path, userRouter.router);
router.use(historyRouter.path, historyRouter.router);
router.use(configRouter.path, configRouter.router);
router.get('/healthCheck', (req, res, next) => {
    Sequelize().authenticate()
        .then(async function SequelizeAuthCallback() {
            const pkg = require('../../package.json');
            res.json({ version: pkg?.version }).status(httpStatus.OK);
        })
        .catch(function SequelizeAuthCallback (err) {
            logger.error('Unable to connect to the database:', err);
            res.json({ status: 'fail', message: err.message }).status(httpStatus.INTERNAL_SERVER_ERROR);
        });
})

// https://github.com/jduncanator/node-diskusage/issues/41
// Broken for me on node 13.0.1.. need to search for some other package
/*router.get('/diskCheck', async (req, res, next) => {
    /!*available: Disk space available to the current user (i.e. Linux reserves 5% for root)
    free: Disk space physically free
    total: Total disk space (free + used)*!/
    const { free, available, total } = await diskusage.check(diskPath);
    let usage = available * 100 / total;
    let status = usage > 80 ? httpStatus.INSUFFICIENT_STORAGE : httpStatus.OK;
    res.json({ usage: `${usage.toFixed(1)}%` }).status(status);
})*/

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
