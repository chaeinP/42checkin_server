import {dailyfile} from 'tracer';
import tracer from 'cls-rtracer';
import context from 'express-http-context';
import {getPlainObject} from './utils';
import getCurrentLine from 'get-current-line';

const rootFolder = './logs';
const pmId = process.env.pm_id ? process.env.pm_id : 0;
const splitFormat = `yyyymmdd`;
const logFormat = '{{timestamp}} {{title}} {{file}}:{{line}} ({{method}}) {{tid}} [{{login}}] {{message}}';
const jsonFormat = '{ timestamp:{{timestamp}}, level:{{title}}, file:{{file}}, line:{{line}}, method:{{method}}, tid:{{tid}}, user:{{login}}, httpStatus:{{httpStatus}}, payload:{{message}} }';
const dateformat = 'yyyy-mm-dd"T"HH:MM:ss.lo';

exports.filter = {
    console: true,
    debug: true,
    log: true,
    error: true,
    info: true,
    fatal: true,
    sql: true,
    api: true,
}
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
        if (exports.filter.console) console.log(data.output);
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

        const httpStatus = context.get('httpStatus');
        data.httpStatus = httpStatus ? httpStatus : '';
    },
    transport: function(data: any) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) {
            return;
        }
        if (exports.filter.console) console.log(data.output);
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
        stackIndex: 1,
    }
});

const handler = dailyfile({
    ...logConfig,
    ...{
        allLogsFileName: 'ftl',
        level: 'fatal',
        stackIndex: 2,
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

const net = dailyfile({
    ...jsonConfig,
    ...{
        allLogsFileName: 'net',
        level: 'log',
        format: jsonFormat,
    }
});

// noinspection DuplicatedCode
const logger = {
    init (options: any) {
        exports.filter = {...exports.filter, ...options};
        log.log('logger initialized...', exports.filter);
        console.log('logger initialized...', exports.filter);
    },
    // errorHandle에서 slack으로 보내는 메시지용
    handler (...args: any[]) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd && exports.filter.console) console.log(...args);
        log.log(...args);
        return exports.filter.fatal ? handler.fatal(...args) : null;
    },
    fatal (...args: any[]) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd && exports.filter.console) console.log(...args);
        log.log(...args);
        return exports.filter.fatal ? fatal.fatal(...args) : null;
    },
    error (...args: any[]) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) console.log(...args);
        log.log(...args);
        return exports.filter.error ? error.error(...args) : null;
    },
    info (...args: any[]) {
        return exports.filter.info ? info.info(...args) : null;
    },
    debug (...args: any[]) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) return;

        return exports.filter.debug ? debug.debug(...args) : null;
    },
    sql (...args: any[]) {
        return exports.filter.log ? sql.log(...args) : null;
    },
    log (...args: any[]) {
        return exports.filter.log ? log.log(...args) : null;
    },
    req (request: any) {
        /*
        Usages {
            dataValues: { login: 'ohjongin', date: '2021-10-06', seconds: '1167417' },
            _previousDataValues: { login: 'ohjongin', date: '2021-10-06', seconds: '1167417' },
            _changed: Set(0) {},
            _options: {
              isNewRecord: false,
              _schema: null,
              _schemaDelimiter: '',
              raw: true,
              attributes: [Array]
            },
            isNewRecord: false
          }
         */
        return exports.filter.api ? net.log(request) : null;
    },
    res(httpStatus: number, response: any) {
        context.set('httpStatus', httpStatus);
        return exports.filter.api ? net.log(getPlainObject(response)) : null;
    }
};


export default logger;
