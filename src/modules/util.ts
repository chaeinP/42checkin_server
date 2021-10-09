import moment from 'moment-timezone';

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

export const getTimezoneDateString = (dt : Date) => {
    const offset = dt.getTimezoneOffset()
    const localDate = new Date(dt.getTime() - (offset*60*1000));
    return getDateString(localDate);
}

export const getDateString = (dt : Date) => {
    return dt.toISOString().replace('T', ' ').split('.')[0];
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
