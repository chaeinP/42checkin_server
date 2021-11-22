import env from '@modules/env';
import ApiError from '@modules/api.error';
import httpStatus from 'http-status';
import { Config, Config as IConfig } from '@models/config';
import Sequelize, { Op } from 'sequelize';
import logger from "@modules/logger";
import {getTimezoneDateString} from "@modules/util";
import {IJwtUser} from "@modules/strategy.jwt";
import {getUser} from "@service/user.service";

/**
 *
 * @param date YYYY-MM-DD, KST 기준
 * @param comment config API 호출시 SQL에 추가하는 comment
 * @returns
 */
export const getConfig = async (date: string, comment?: string) => {
	const node_env = env.node_env ? env.node_env : 'development';

    if (!date) {
        date = getTimezoneDateString(new Date()).slice(0,10);
        logger.log(`Date is empty... Use today: ${date}`);
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
        order: [['created_at', 'DESC'], ['_id', 'DESC']]
    });
    
	if (setting) {
		return setting;
	} else {
        let msg = `[${node_env}] 해당 날짜(${date})의 설정값이 서버에 존재하지 않습니다.`;
        logger.error(msg, 'date:', date, 'setting:', setting);
		throw new ApiError(httpStatus.NOT_FOUND, msg, {stack: new Error(msg).stack});
	}
};

export const setConfig = async (body: { values: Partial<IConfig>, date: string }, jwt?: IJwtUser) => {
    const { values, date } = body;
    let setting = await getConfig(date);
	if (Number.isInteger(values.gaepo)) setting.gaepo = values.gaepo;
    if (Number.isInteger(values.seocho)) setting.seocho = values.seocho;
	if (values.begin_at) setting.begin_at = values.begin_at;
	if (values.end_at) setting.end_at = values.end_at;
    if (values.open_at) setting.open_at = values.open_at;
    if (values.close_at) setting.close_at = values.close_at;
    if (values.auth) setting.auth = values.auth;

    if (jwt) {
        const user = await getUser(jwt._id);
        setting.actor = user.login;
    }

    setting.updated_at = new Date();

	return setting.save()
		.then(_ => setting)
		.catch(_ => {
            let msg = `설정값을 수정하는 중 오류가 발생했습니다. - ${env}`;
			throw new ApiError(httpStatus.BAD_REQUEST, msg, {stack: new Error(msg).stack, isFatal: true});
		})
};
