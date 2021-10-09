import {dailyfile} from 'tracer';
import tracer from 'cls-rtracer';
import context from 'express-http-context';

const rootFolder = './logs';
const pmId = process.env.pm_id ? process.env.pm_id : 0;
const splitFormat = `yyyymmdd`;
const logFormat = '{{timestamp}} {{title}} {{file}}:{{line}} ({{method}}) {{tid}} [{{login}}] {{message}}';
const jsonFormat = '{ timestamp:{{timestamp}}, level:{{title}}, file:{{file}}, line:{{line}}, method:{{method}}, tid:{{tid}}, user:{{login}} httpStatus:{{httpStatus}} payload:{{message}} }';
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

        const httpStatus = context.get('httpStatus');
        data.httpStatus = httpStatus ? httpStatus : '';
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
    // errorHandle에서 slack으로 보내는 메시지용
    handler (...args: any[]) {
        const isProd = process.env.NODE_ENV?.toLowerCase()?.includes('prod')
            || process.env.ENV_TYPE?.toLowerCase()?.includes('prod');
        if (isProd) console.log(...args);
        log.log(...args);
        return handler.fatal(...args);
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
        return http.log(request);
    },
    res(httpStatus: number, response: any) {
        context.set('httpStatus', httpStatus);

        let result = { ...response};
        try {
            if (Array.isArray(response?.list)) {
                result.list = [];
                for (let item of response?.list) {
                    if (item.get) {
                        result.list.push(item.get({plain: true}))
                    } else {
                        result.list.push(item);
                    }
                }
            }
        } catch (e) {
            logger.error(e);
            result = { ...response};
        }

        return http.log(result);
    }
};


export default logger;