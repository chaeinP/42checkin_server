import {Router} from "express";

import * as userRouter from '@routes/user.router'
import * as configRouter from '@routes/config.router'
import * as historyRouter from '@routes/history.router';
import * as checkRouter from '@routes/check.router';

export const router = Router();
export const path = '';

router.use(userRouter.path, userRouter.router);
router.use(historyRouter.path, historyRouter.router);
router.use(configRouter.path, configRouter.router);
router.use(checkRouter.path, checkRouter.router);

