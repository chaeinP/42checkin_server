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
