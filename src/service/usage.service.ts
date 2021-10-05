import {Sequelize, Op} from "sequelize";
import logger from '../modules/logger';
import { Users } from 'src/models/users';
import { Usage } from '@models/usage';
import { now, getLocalDate } from '@modules/util';
import {IJwtUser} from "@modules/jwt.strategy";

const DIVIDER_FOR_DURATION = 60;

/**
 * 사용 시간 정보를 생성한다.
 */
export const create = async (user: Users, actor: string): Promise<void> => {
    logger.info({
        type: 'get',
        message: 'create log',
        data: { card_no: user.card_no, _id: user._id },
    });

    let duration: number = now().toDate().getTime() - getLocalDate(new Date(user.checkin_at)).toDate().getTime();
    logger.log(`now: ${now().toDate().getTime()}`)
    logger.log(`checkin: ${getLocalDate(new Date(user.checkin_at)).toDate().getTime()}`)
    logger.log(`duration: ${duration / DIVIDER_FOR_DURATION}`)

	const usage = await Usage.create({
        login: user.login,
        checkin_at: user.checkin_at,
        checkout_at: now().toDate(),
        duration: duration / DIVIDER_FOR_DURATION,
        actor: actor,
        created_at: now().toDate()
    });
	await usage.save();
};

/**
 * 사용 시간 정보를 생성한다.
 */
export const getUsages = async (userInfo: IJwtUser, from: string, to: string): Promise<any> => {
    const user = await Users.findOne({ where: { _id: userInfo._id } });
    logger.debug({
        type: 'get',
        message: 'getUsages',
        data: { user: user.login, _id: user._id, from: from, to: to },
    });

    const conditions = {
        login: user.login,
        checkin_at: {
            [Op.gte]: from
        },
        checkout_at: {
            [Op.lt]: to
        },
    };

    const usages = await Usage.findAll({
        attributes: ['login',
            [Sequelize.fn('date_format', Sequelize.col('checkin_at'), '%Y-%m-%d'), 'day'],
            [Sequelize.fn('sum', Sequelize.col('duration')), 'amount_seconds']],
        where: conditions,
        group : [Sequelize.fn('date_format', Sequelize.col('checkin_at'), '%Y-%m-%d'), 'day'],
    });

    logger.debug(usages);

    return usages;
};
