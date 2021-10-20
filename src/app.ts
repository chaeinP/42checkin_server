import express, {NextFunction} from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import tracer from 'cls-rtracer';
import context from 'express-http-context';
import swaggerUi from 'swagger-ui-express';
import env from '@modules/env';
import passport from 'passport';
import appRootPath from "app-root-path";
import logger from './modules/logger';

import * as requestIp from 'request-ip';
import * as Api from '@routes/routes';

import {errorConverter, errorHandler} from '@modules/error';

const port = env.port || 3000;
export const app = express();

function getOrigin() {
	const origin = [env.url.client, env.url.admin];
	if (env.node_env === 'production') {
		origin.push(env.url.client_old);
	}
	return origin;
}

app.use(cookieParser());
app.use(express.json());
app.use(express.static("public"));
app.use(requestIp.mw());
app.use(passport.initialize());
app.use(passport.session());
app.use(tracer.expressMiddleware());
app.use(context.middleware);
app.use(cors({ origin: getOrigin(), credentials: true }));
app.use((req, res, next) => {
	const { method, path, url, query, headers, body, params, cookies } = req;
	const request = { method, path, url, query, headers, body, params, cookies };
    if (path !== '/healthCheck') {
        logger.log(method, url, query, cookies);
        logger.req(request);
    }
	next();
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(require('./swagger/swagger.json')));
app.use(Api.path, Api.router);
app.use(errorConverter);
app.use(errorHandler);
const server = app.listen(port, () => {
	logger.log(`=================================`);
    logger.log(`======= ENV: ${env.node_env} =============`);
    logger.log(`🚀 App listening on the port ${port}`);
    logger.log(`=================================`);
});
