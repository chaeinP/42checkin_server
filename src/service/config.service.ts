import env from '@modules/env';
import ApiError from '@modules/api.error';
import httpStatus from 'http-status';
import { Config, Config as IConfig } from '@models/config';
import Sequelize, { Op } from 'sequelize';
import logger from "@modules/logger";
import {getTimezoneDateString} from "@modules/util";

/**
 *
 * @param date YYYY-MM-DD
 * @returns
 */
export const getConfig = async (date: string, comment?: string) => {
	const node_env = env.node_env ? env.node_env : 'development';

    if (!date) {
        logger.error(`Invalid Date: ${date}`);
        date = getTimezoneDateString(new Date()).slice(0,10);
    }

    const _comment = comment ? comment : '';
	const setting = await Config.findOne({
        attributes: {
            include: [
                [Sequelize.literal(`/* ${_comment} */ 1`), '_comment'],
            ],
        },
        where: {
            env: node_env,
            begin_at: {
                [Op.lte]: date
            },
            end_at: {
                [Op.gt]: date
            },
            deleted_at: {
                [Op.eq]: null
            },
        },
        order: [['_id', 'DESC']]
    });
    
	if (setting) {
		return setting;
	} else {
        let msg = `해당 날짜(${date})의 설정값이 서버에 존재하지 않습니다.`;
        logger.error(msg, 'date:', date, 'setting:', setting);
		throw new ApiError(httpStatus.NOT_FOUND, msg, {stack: new Error(msg).stack});
	}
};

export const setConfig = async (body: { env: Partial<IConfig>, date: string }) => {
    const { env, date } = body;
    let setting = await getConfig(date);
	if (Number.isInteger(env.gaepo)) setting.gaepo = env.gaepo;
    if (Number.isInteger(env.seocho)) setting.seocho = env.seocho;
	if (env.begin_at) setting.begin_at = env.begin_at;
	if (env.end_at) setting.end_at = env.end_at;
    if (env.auth) setting.auth = env.auth;
	return setting.save()
		.then(_ => setting)
		.catch(_ => {
            let msg = '설정값을 수정하는 중 오류가 발생했습니다.';
			throw new ApiError(httpStatus.BAD_REQUEST, msg, {stack: new Error(msg).stack, isFatal: true});
		})
};
