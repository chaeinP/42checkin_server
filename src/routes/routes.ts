import {Router} from "express";

import * as userRouter from '@routes/user.routes'
import * as configRouter from '@routes/config.routes'
import * as historyRouter from '@routes/history.routes';
import {exec} from 'child_process';

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
router.get('/diskCheck', async (req, res, next) => {
    try {
        exec("df -h", (error, stdout, stderr) => {
            let diskInfo = {};
            let status = httpStatus.OK;
            if (error) {
                diskInfo = {...diskInfo, error: error}
                logger.error('error:', error);
            } else if (stderr) {
                diskInfo = {...diskInfo, stderr: stderr}
                logger.error('stderr:', stderr);
            } else {
                let result = stdout.split('\n');
                for (let item of result) {
                    let trimed = item.replace(/\s\s+/g, ' ');
                    let info = trimed.split(' ');
                    if (info?.length < 1) continue;

                    if (info[5] === '/') {
                        diskInfo = {...diskInfo, path: info[5], filesystem: info[0], size: info[1], used: info[2], avail: info[3], percent: info[4]}
                        let percent = parseInt(info[4].replace('%', ''));
                        status = percent > 80 ? httpStatus.INSUFFICIENT_STORAGE : httpStatus.OK;
                    }
                }
                logger.log('stdout:', result);
            }

            res.json({ disk_info: diskInfo }).status(httpStatus.OK);
        });
    } catch (e) {
        res.json({ error: e }).status(httpStatus.INTERNAL_SERVER_ERROR);
    }
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
