import { Router } from "express";

import * as userRouter from '@routes/user.routes'
import * as configRouter from '@routes/config.routes'
import * as historyRouter from '@routes/history.routes';
import { Sequelize } from "@models/index";
import logger from "@modules/logger";

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