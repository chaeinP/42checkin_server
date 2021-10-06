import {dailyfile} from 'tracer';
import tracer from 'cls-rtracer';
import context from 'express-http-context';

const rootFolder = './logs';
const pmId = process.env.pm_id ? process.env.pm_id : 0;
const splitFormat = `yyyymmdd`;
const logFormat = '{{timestamp}} {{title}} {{file}}:{{line}} ({{method}}) {{tid}} [{{login}}] {{message}}';
const jsonFormat = '{ timestamp:{{timestamp}}, level:{{title}}, file:{{file}}, line:{{line}}, method:{{method}}, tid:{{tid}}, user:{{login}} payload:{{message}} }';
const dateformat = 'yyyy-mm-dd"T"HH:MM:ss.lo';
/**
 * root: 파일위치
 * allLogsFileName: 로그 파일명
 * stackIndex: 로거를 사용하는곳을 알아내기 위해사용한다. 기본값 0을 사용하면 logger.ts가 찍힌다.
 * 1을 사용하면 한단계 위의 콜스택인 logger.ts를 사용하는 곳의 파일이 찍힌다.
 * format: 현재 로그 파일의 형식을 커스텀하게 지정한다.
 * preprocess: 로그 오브젝트를 불러와서 커스텀할 필터를 적용한다.
 * */

const convTitle = (title: string) => {
    let result: string;

    switch (title) {
        case 'error':
            result = 'ERR'
            break;
        case 'warn':
            result = 'WRN'
            break;
        case 'info':
            result = 'INF'
            break;
        case 'debug':
            result = 'DBG'
            break;
        case 'fatal':
            result = 'FTL'
            break;
        case 'trace':
            result = 'TRC'
            break;
        default:
            result = 'LOG'
            break;
    }

    return result;
}

let logConfig = {
    root: rootFolder,
    allLogsFileName: 'inf',
    format: logFormat,
    dateformat: dateformat,
    splitFormat: splitFormat,
    stackIndex: 1,
    level: 'info',
    preprocess: function(data: any) {
        data.title = convTitle(data.title)?.toUpperCase();
        data.tid = `${tracer.id() ? tracer.id() : '00000000-0000-0000-0000-000000000000'}`;

        const login = context.get('login');
        data.login = login ? login : '';
    },
    transport: function(data: any) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) {
            return;
        }
        console.log(data.output);
    }
}

let jsonConfig = {
    root: rootFolder,
    allLogsFileName: 'inf',
    format: logFormat,
    dateformat: dateformat,
    splitFormat: splitFormat,
    stackIndex: 1,
    level: 'info',
    preprocess: function(data: any) {
        data.title = convTitle(data.title)?.toUpperCase();
        data.tid = `${tracer.id() ? tracer.id() : '00000000-0000-0000-0000-000000000000'}`;

        const login = context.get('login');
        data.login = login ? login : '';
    },
    transport: function(data: any) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) {
            return;
        }
        console.log(data.output);
    }
}

/**
 * root: 파일위치
 * allLogsFileName: 로그 파일명
 * stackIndex: 로거를 사용하는곳을 알아내기 위해사용한다. 기본값 0을 사용하면 logger.ts가 찍힌다.
 * 1을 사용하면 한단계 위의 콜스택인 logger.ts를 사용하는 곳의 파일이 찍힌다.
 * format: 현재 로그 파일의 형식을 커스텀하게 지정한다.
 * preprocess: 로그 오브젝트를 불러와서 커스텀할 필터를 적용한다.
 * */
const info = dailyfile({
    ...logConfig,
    ...{
        allLogsFileName: 'inf',
        level: 'info',
    }
});

const error = dailyfile({
    ...logConfig,
    ...{
        allLogsFileName: 'err',
        level: 'error',
    }
});

const fatal = dailyfile({
    ...logConfig,
    ...{
        allLogsFileName: 'ftl',
        level: 'fatal',
    }
});


const log = dailyfile({
    ...logConfig,
    ...{
        allLogsFileName: 'app',
        level: 'log',
    }
});

const debug = dailyfile({
    ...logConfig,
    ...{
        allLogsFileName: 'dbg',
        level: 'debug',
    }
});

const sql = dailyfile({
    ...logConfig,
    ...{
        allLogsFileName: 'sql',
        level: 'log',
    }
});

const http = dailyfile({
    ...jsonConfig,
    ...{
        allLogsFileName: 'htp',
        level: 'log',
        format: jsonFormat,
    }
});

const logger = {
    init () {
        log.log('initialized...');
        console.log('initialized...');
    },
    fatal (...args: any[]) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) console.log(...args);
        log.log(...args);
        return fatal.fatal(...args);
    },
    error (...args: any[]) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) console.log(...args);
        log.log(...args);
        return error.error(...args);
    },
    info (...args: any[]) {
        return info.info(...args);
    },
    debug (...args: any[]) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) return;

        return debug.debug(...args);
    },
    sql (...args: any[]) {
        return sql.log(...args);
    },
    log (...args: any[]) {
        return log.log(...args);
    },
    req (request: any) {
        if (request?.body?.dataValues) {
            request.body = request?.body?.dataValues;
        }
        return http.log(request);
    },
    res (response: any) {
        if (response?.body?.dataValues) {
            response.body = response?.body?.dataValues;
        }
        return http.log(response);
    }
};


export default logger;