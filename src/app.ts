import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import tracer from 'cls-rtracer';
import context from 'express-http-context';
import env from '@modules/env';
import passport from 'passport';
import logger from './modules/logger';

import * as requestIp from 'request-ip';
import * as Api from '@routes/routes';

import {errorConverter, errorHandler} from '@modules/error';
import {Sequelize} from './models';

const port = env.port || 3000;
export const app = express();

function getOrigin() {
	const origin = [env.url.client, env.url.admin];
	if (env.node_env === 'production') {
		origin.push(env.url.client_old);
	}
	return origin;
}

Sequelize().sync({force: false})
    .then((v) => {
        try {
            app.emit('dbconnected')
            console.log('🚀 db connected');
        } catch (error) {
            logger.error(error);
        }
    })
    .catch(err => {
        console.log(err);
        throw err
    });

app.use(cookieParser());
app.use(express.json());
app.use(requestIp.mw());
app.use(passport.initialize());
app.use(passport.session());
app.use(tracer.expressMiddleware());
app.use(context.middleware);
app.use(cors({ origin: getOrigin(), credentials: true }));
app.use((req, res, next) => {
	const { method, path, url, query, headers, body, params, cookies } = req;
	const request = { method, path, url, query, headers, body, params, cookies };
    logger.log(method, url, query, cookies);
	logger.req(request);
	next();
});
app.use(Api.path, Api.router);
app.use(errorConverter);
app.use(errorHandler);
const server = app.listen(port, () => {
	console.log(`=================================`);
	console.log(`======= ENV: ${env.node_env} =============`);
	console.log(`🚀 App listening on the port ${port}`);
	console.log(`=================================`);
});
