import httpStatus from 'http-status';
import Sequelize, { Op } from 'sequelize';
import context from "express-http-context";

import { Config } from '@models/config';
import env from '@modules/env';
import ApiError from '@modules/api.error';
import logger from "@modules/logger";

/**
 *
 * @param date YYYY-MM-DD, KST 기준
 * @param comment config API 호출시 SQL에 추가하는 comment
 * @returns
 */
export const getConfigByDate = async (date: string, comment?: string) => {
	const node_env = env.node_env ? env.node_env : 'development';
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

    return setting;
};

/**
 *
 * @param date YYYY-MM-DD, KST 기준
 * @param comment config API 호출시 SQL에 추가하는 comment
 * @returns
 */
export const getConfigById = async (id: number, comment?: string) => {
    const node_env = env.node_env ? env.node_env : 'development';

    const _comment = comment ? comment : '';
    const setting = await Config.findOne({
        attributes: {
            include: [
                [Sequelize.literal(`/* ${_comment} */ 1`), '_comment'],
            ],
        },
        where: {
            _id: id,
            deleted_at: {
                [Op.eq]: null
            },
        },
        order: [['created_at', 'DESC'], ['_id', 'DESC']]
    });

    if (setting) {
        return setting;
    } else {
        let msg = `[${node_env}] 해당 ID(${id})의 설정값이 서버에 존재하지 않습니다.`;
        logger.error(msg, '_id:', id, 'setting:', setting);
        throw new ApiError(httpStatus.NOT_FOUND, null, msg, {stack: new Error(msg).stack});
    }
};

export const setConfigByDate = async (date: string, values: Partial<Config>) => {
    let setting = await getConfigByDate(date);
    if (!setting) return setting;
    return await setConfig(setting, values);
};

export const setConfigById = async (id: number, values: Partial<Config>) => {
    let setting = await getConfigById(id);
    return await setConfig(setting, values);
};

export const setConfig = async (setting: Config, values: Partial<Config>) => {
    if (Number.isInteger(values?.gaepo)) setting.gaepo = values.gaepo;
    if (Number.isInteger(values?.seocho)) setting.seocho = values.seocho;
    if (values?.begin_at) setting.begin_at = values.begin_at;
    if (values?.end_at) setting.end_at = values.end_at;
    if (values?.open_at) setting.open_at = values.open_at;
    if (values?.close_at) setting.close_at = values.close_at;
    if (values?.auth) setting.auth = values.auth;

    const login = context.get('login');
    if (login) {
        setting.actor = login;
    }

    setting.updated_at = new Date();

    return setting.save()
        .then(_ => setting)
        .catch(e => {
            if (e.parent.code == "ER_TRUNCATED_WRONG_VALUE"){
                let msg = `업데이트 할 설정 값이 올바르지 않습니다. - ${env.node_env}`;
                throw new ApiError(httpStatus.BAD_REQUEST, null, msg, {stack: new Error(msg).stack, isFatal: true});
            }
            else throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, null, e.message, {stack: new Error().stack, isFatal: true})
        })
};
