import {Router} from "express";

import * as userRouter from '@routes/v1/user.router'
import * as configRouter from '@routes/v1/config.router'
import * as historyRouter from '@routes/v1/history.router';
import * as MonitorRouter from '@routes/v1/monitor.router';
import * as ClusterRouter from '@routes/v1/cluster.router';

export const router = Router();
export const path = '/v1';

router.use(userRouter.path, userRouter.router);
router.use(historyRouter.path, historyRouter.router);
router.use(configRouter.path, configRouter.router);
router.use(MonitorRouter.path, MonitorRouter.router);
router.use(ClusterRouter.path, ClusterRouter.router);
