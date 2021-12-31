import moment from 'moment-timezone';
import path from "path";

const TZ = 'Asia/Seoul';

export const isError = (e: any) => {
	return e && e.stack && e.message;
};

export const getTimeFormat = (timestamp: moment.MomentInput, format: string) => {
	const str = moment(timestamp).tz(TZ).format(format);
	return str;
}

export const now = () => {
    return moment().tz(TZ);
}

export const getLocalDate = (date: Date) => {
    return moment(date).tz(TZ);
}

export const getTimezoneDate = (dt : Date) => {
    const offset = dt.getTimezoneOffset()
    return  new Date(dt.getTime() - (offset*60*1000));
}
export const getTimezoneDateString = (dt : Date) => {
    return getDateString(getTimezoneDate(dt));
}

export const getDateString = (dt : Date) => {
    return dt.toISOString().replace('T', ' ').split('.')[0];
}

export const getTimeNumber = (t : string) => {
    let data = t.split(':');
    let hour = parseInt(data[0]);
    let minute = parseInt(data[1])
    let seconds = data.length > 2 ? parseInt(data[2]) : 0;

    return (hour * 3600) + (minute * 60) + seconds;
}

export const getPlanObject = (data: any) => {
    let result = { ...data};
    try {
        if (Array.isArray(data?.list)) {
            result.list = [];
            for (let item of data?.list) {
                if (item.get) {
                    result.list.push(item.get({plain: true}))
                } else {
                    result.list.push(item);
                }
            }
        }
    } catch (e) {
        result = data;
    }

    return result;
}

// Stack trace format :
// https://github.com/v8/v8/wiki/Stack%20Trace%20API
// https://v8.dev/docs/stack-trace-api
const stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/i;
const stackReg2 = /at\s+(.*):(\d*):(\d*)/i;

/**
 * Use CallSite to extract filename and number, for more info read: https://v8.dev/docs/stack-trace-api#customizing-stack-traces
 * @returns {string} filename and line number separated by a colon
 */
const getRunStack = (depth) => {
    let data = {
        method: null,
        path: null,
        line: null,
        pos: null,
        file: null,
        stack: null
    };

    if (!depth) depth = 2;

    // get call stack, and analyze it
    // get all file,method and line number
    let stack = (new Error()).stack.split('\n')
    let stacklist = stack.length > depth ? stack.slice(depth) : stack.slice(stack.length - 1);
    let s =  stacklist[0],
        sp = stackReg.exec(s) || stackReg2.exec(s);
    if (sp && sp.length === 5) {
        data.method = sp[1];
        data.path = sp[2];
        data.line = sp[3];
        data.pos = sp[4];
        data.file = path.basename(data.path);
        data.stack = stacklist.join('\n');
    }

    return data;
};

export const getCaller = () => {
    let data = getRunStack(4);
    return { file: data.file,
        line: data.line,
        func: data.method };
};

export const getCallerInfo = () => {
    const { file, line } = getCaller();
    return `${file}:${line}`;
}