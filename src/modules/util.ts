import moment from 'moment-timezone';

const TZ = 'Asia/Seoul';

export const isError = (e: any) => {
	return e && e.stack && e.message;
};

export const getTimeFormat = (timestamp: moment.MomentInput, format: string) => {
    return moment(timestamp).tz(TZ).format(format);
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

export const isEmptyObject = (obj: any) => {
    return !obj || Object.keys(obj).length === 0;
}

export const getPlanObject = (data: any) => {
    if (isEmptyObject(data)) return Array.isArray(data) ? [] : {};

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
