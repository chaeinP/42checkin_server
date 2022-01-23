import axios from "axios";
import sleep from "await-sleep";
import prune from "json-prune";
import { getDateDiffString } from "./utils";
import {delayAdapterEnhancer} from "axios-delay";
import time from "./time";
import logger from "./logger";
import loki from 'lokijs';

const { notifyJobError } = require('./slack');
let axiosClient = null;

const apiKeyList = [
    {
        "owner": "ohjongin",
        "client_id": "e901bbb9b758f58ea7e14acb40a21fae824bdc5e99a79405c13673b2ddb2ac1a",
        "client_secret": "4424b5db7245d9e37de56879033f2dd93f6ab61cf9eb0c731fc0fbb4ac662333",
        "grant_type": "client_credentials"
    },
    {
        "owner": "ohjongin",
        "client_id": "2067f6233450bde2cd71303b0c827393bc96d6d153f9aaa676a7029a16b3578e",
        "client_secret": "1c833d46859d0e3686a92cfd66d1d44ff3843783201590ec8b3c676d84073959",
        "grant_type": "client_credentials"
    }
];

const initAuth = async (index) => {
    const db = new loki(".42auth.db.json");

    let ret = await new Promise((resolve, reject) => {
        db.loadDatabase({}, function () {
            let credentials = db.getCollection('credentials');
            let tokens = db.getCollection('tokens');
            return resolve({credentials: credentials, tokens: tokens});
        });
    })
    let credentials = db.addCollection("credentials", { indices: ["index"] });
    let tokens = db.addCollection("tokens", { indices: ["index"] });

    for (let i = 0; i < apiKeyList.length; i++) {
        const key = apiKeyList[i];
        credentials.insert({
            index: i,
            client_id: key.client_id,
            client_secret: key.client_secret,
            grant_type: key.grant_type
        });
    }

    db.saveDatabase();
}

const getAuthString = async (index) => {

    // logger.log(index, JSON.stringify(auth_data));
    return `${auth_data.token_type} ${auth_data.access_token}`;
}

const parse42Header = (response) => {
    const headers = response?.headers;

    let limit = parseInt(response.headers['x-hourly-ratelimit-limit']);
    let usage = limit - parseInt(response.headers['x-hourly-ratelimit-remaining']);
    let percent = Math.floor(usage * 100 / limit);

    let secondly_limit = response.headers['x-secondly-ratelimit-limit'];
    let secondly_remaining = response.headers['x-secondly-ratelimit-remaining'];
    let secondly_usage = secondly_limit - secondly_remaining;

    let runtime = response.headers['x-runtime'];

    return {
        pid: headers['pid'],
        index: headers['index'],
        limit: limit,
        usage: usage,
        percent: percent,
        secondly: {
            limit: secondly_limit,
            usage: secondly_usage,
            remaining: secondly_remaining,
        },
        runtime: runtime
    }
}

const axiosResponseHandler = async (response) => {
    if (!response?.headers) {
        return response;
    }

    let parsed = parse42Header(response.headers);

    const estimated = Math.floor(new Date().getMinutes() * 100 / 60);
    const usage = parsed?.usage;
    const authIndex = parsed?.index;
    const limit = parsed?.limit;
    const percent = parsed?.percent;
    const secondly_usage = parsed?.secondly?.usage;
    const secondly_limit = parsed?.secondly?.limit;
    const secondly_remaining = parsed?.secondly?.remaining;
    const runtime = parsed?.runtime;

    if (usage % 10 === 0) {
        let msg = `[${authIndex}] API_USAGE: ${usage} / ${limit}, (${percent}% < ${estimated}%), ${secondly_usage} / ${secondly_limit}, ${runtime}`;
        logger.log(msg)
        let diff = percent - estimated;
        if (percent > estimated && estimated > 10 && diff > 1) {
            // 1 percent 는 72초
            let delay = 72 * diff * 1000
            if (percent < (estimated * 1.5)) {
                // 시간대비 사용량을 초과하면 최대 10분을 기다린다
                delay = Math.min(delay, 10 * 60 * 1000);
            }
            logger.log(`[${authIndex}] Waiting for ${getDateDiffString(delay,true)} to compensate usages`);
            await sleep(delay);
        }
    }

    if (secondly_remaining < 1) {
        logger.info(`[${authIndex}] (${secondly_usage}/${secondly_limit}) url: ${response.config.url}`);
        await sleep(1000);
    }

    return response;
}

const axiosErrorHandler = async (err) => {
    let status;
    let remaining = ''
    let resolved = false;
    let pidInfo = await storage.get(`pid_${process.pid}`);
    let authIndex = pidInfo ? pidInfo.index : 0;

    logger.error(err)
    logger.error(err.config)
    if (!err.request) {
        return Promise.reject(err);
    }

    if (err.response) {
        if (err.response.config) {
            logger.error(`[${authIndex}] ${err.response.config.url} (${err.response.status}:${err.response.statusText})`);
        }

        if (err.response.headers) {
            let secondly_limit = err.response.headers['x-secondly-ratelimit-limit'];
            let secondly_remaining = err.response.headers['x-secondly-ratelimit-remaining'];
            let runtime = err.response.headers['x-runtime'];

            remaining = `${secondly_remaining} / ${secondly_limit}, ${runtime}`;
        }
    }

    try {
        let req = (err.request) ? prune(err.request) : {};

        let user_id = null;
        let headers = null;
        if (req && req.config && req.config.headers) {
            headers = req.config.headers;
        } else if (err.config) {
            headers = err.config.headers;
        }

        if (headers) {
            user_id = headers['x-ia-user-id'];
        }

        status = err.response ? err.response.status : null;
        let reason = status ? err.response.statusText : err.code;
        let url = err.request.path;
        if (!url) url = err.config.url;

        logger.log(`[${authIndex}] ${status} ${reason} ${user_id} ${remaining} ${url}`);

        switch (status) {
            case 500:
                await notifyJobError(storage, new Error(`[${status}] ${reason}: ${url}`));
                // '/v2/users'는 delay를 따로 처리한다
                if (!url?.includes('/v2/users')) await sleep(time.MINUTE * 30);
                break;
            case 429: // Too Many Requests
                logger.log(`[${authIndex}] (${status}) ${reason} ${JSON.stringify(err.response.headers)}`);
                let retryAfter = err.response.headers['retry-after'];
                if (!retryAfter) {
                    retryAfter = getNextResetSec();
                }
                logger.log(`[${authIndex}] (${status}) ${reason} Waiting for next reset... `, retryAfter, 'seconds');
                await sleep(retryAfter * 1000);
                break;
            case 401: // Unauthorized
                logger.log(`[${authIndex}] (${status}) ${reason} Unauthorized...`);
                await checkAuthData(process.pid, true);
                await checkAuthTokenInfo(process.pid);
                break;
            case 404: // Not Found
                break;
            default:
                await notifyJobError(storage, new Error(`[${status}] ${reason}: ${url}`));
                await sleep(time.MINUTE * 30);
                break;
        }
    } catch (e) {
        logger.error(e);
    }

    return resolved ? Promise.resolve() : Promise.reject(err);
}

const getHttpClient = (index) => {
    if (axiosClient) {
        return axiosClient;
    }

    // Works with custom axios instances
    let client;
    client = axios.create({
        baseURL: 'https://api.intra.42.fr',
        adapter: delayAdapterEnhancer(axios.defaults.adapter)
    });
    /*client.defaults.raxConfig = {
        // Retry 3 times on requests that return a response (500, etc) before giving up.  Defaults to 3.
        retry: 1,
        // If you are using a non static instance of Axios you need
        // to pass that instance here (const ax = axios.create())
        instance: client,
        // options are 'exponential' (default), 'static' or 'linear'
        backoffType: 'exponential',

        // You can detect when a retry is happening, and figure out how many
        // retry attempts have been made
        onRetryAttempt: err => {
            const cfg = rax.getConfig(err);
            logger.log(`Retry attempt ${JSON.stringify(cfg, null, 2)}`);
        }
    }*/
    client.interceptors.request.use(
        async config => {
            // 요청 성공 직전 호출됩니다.
            // axios 설정값을 넣습니다. (사용자 정의 설정도 추가 가능)
            // console.log(api_counter, config.url);
            if (config && config.url && !config.url.includes('/oauth/token')) {
                await checkAuthData(process.pid);
                let headers = {
                    'Authorization': await getAuthString(index),
                    'Accept': 'application/json',
                };

                config.headers = {
                    ...config.headers,
                    ...headers
                }
            }
            return config;
        },
        async error => {
            // 요청 에러 직전 호출됩니다.
            logger.error(error);
            if (error && error.stack) logger.error(error.stack)
            return Promise.reject(error);
        }
    );
    client.interceptors.response.use(axiosResponseHandler, axiosErrorHandler);

    axiosClient = client;
    return client;
}

module.exports = {
    initAuth,
    getHttpClient,
}