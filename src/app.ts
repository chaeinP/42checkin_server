import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import tracer from 'cls-rtracer';
import context from 'express-http-context';
import swaggerUi from 'swagger-ui-express';
import env from './modules/env';
import passport from 'passport';
import cron from 'node-schedule';
import axios from 'axios';
import logger from './modules/logger';

import * as requestIp from 'request-ip';
import * as mainRouter from '@routes/main.router';
import {errorConverter, errorHandler} from '@modules/error';
import {getTimezoneDate} from '@modules/util';
import * as configService from '@service/config.service';

const port = env.port || 3000;
export const app = express();

function getOrigins() {
	const origins = [env.url.client, env.url.admin];
	if (env.node_env === 'production') {
		origins.push(env.url.client_old);
	}
	return origins;
}

/**
 * 42 intra 장애가 잦아서 slack 로그인 전환 여부 확인을 위한 health check
*/
const check42Intra = async () => {
    let strategy;
    const today = getTimezoneDate(new Date()).toISOString().slice(0, 10)
    let config = await configService.getConfig(today, '42checkin_no_logging');
    try {
        const res = await axios.get('https://intra.42.fr');
        strategy = res.status === 200 ? '42' : 'Slack';
    } catch (e) {
        logger.error(e);
        strategy = 'Slack';
    }

    if (config?.auth !== strategy) {
        await configService.setConfig(today,{
            auth: strategy
        });
    }
}

(async() => {
    cron.scheduleJob('*/3 * * * *', check42Intra);
})();

app.use(cookieParser());
app.use(express.json());
app.use(requestIp.mw());
app.use(passport.initialize());
app.use(passport.session());
app.use(tracer.expressMiddleware());
app.use(context.middleware);
app.use(cors({ origin: getOrigins(), credentials: true }));
app.use((req, res, next) => {
	const { method, path, url, query, headers, body, params, cookies } = req;
	const request = { method, path, url, query, headers, body, params, cookies };
    if (path !== '/healthCheck') {
        logger.log(method, url, query, cookies);
        logger.req(request);
    }
	next();
});
app.use('/docs', passport.authenticate('jwt'), swaggerUi.serve, swaggerUi.setup(require('./swagger.json')));
app.use(mainRouter.path, mainRouter.router);
app.use(errorConverter);
app.use(errorHandler);
app.listen(port, () => {
    logger.log(`= [${env.node_env}] =============`);
    logger.log(`🚀 App listening on the port ${port}`);
    logger.log(`=================================`);
});

