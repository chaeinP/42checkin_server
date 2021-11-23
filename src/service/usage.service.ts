import {Sequelize, Op} from "sequelize";
import logger from '../modules/logger';
import { Users } from 'src/models/users';
import { Usages } from '../models/usages';
import { now } from '../modules/util';
import {IJwtUser} from '../modules/strategy.jwt';
import {getUser} from './user.service';

const DIVIDER_FOR_DURATION = 1000;

/**
 * 사용 시간 정보를 생성한다.
 */
export const create = async (user: Users, actor: string): Promise<void> => {
    logger.log('user:', JSON.stringify(user));

    let duration: number = (new Date().getTime() - user.checkin_at.getTime()) / DIVIDER_FOR_DURATION;

	const usage = await Usages.create({
        login: user.login,
        checkin_at: user.checkin_at,
        checkout_at: now().toDate(),
        duration: duration,
        actor: actor,
        created_at: now().toDate()
    });
	await usage.save();
};

/**
 * 사용 시간 정보를 생성한다.
 */
export const getUsagesDaily = async (userInfo: IJwtUser, from: string, to: string): Promise<any> => {
    logger.log('userInfo:', JSON.stringify(userInfo), ', from:', from, ', to:', to);
    const user = await getUser(userInfo._id);
    logger.log('user:', JSON.stringify(user), 'from:', from, 'to:', to);

    const conditions = {
        login: user.login,
        checkin_at: {
            [Op.gte]: from
        },
        checkout_at: {
            [Op.lt]: to
        },
        deleted_at: {
            [Op.eq]: null as Date
        }
    };

    const usages = await Usages.findAll({
        attributes: ['login',
            [Sequelize.fn('date_format', Sequelize.col('checkin_at'), '%Y-%m-%d'), 'date'],
            [Sequelize.fn('sum', Sequelize.col('duration')), 'seconds']],
        where: conditions,
        group : [Sequelize.fn('date_format', Sequelize.col('checkin_at'), '%Y-%m-%d'), 'date'],
        order: [ [Sequelize.literal('date'), 'ASC'] ],
    });

    return { list: usages };
};

export const getUsagesList = async (userInfo: IJwtUser, from: string, to: string): Promise<any> => {
    logger.log('userInfo:', JSON.stringify(userInfo), ', from:', from, ', to:', to);

    const user = await getUser(userInfo._id);
    logger.log('user:', JSON.stringify(user), 'from:', from, 'to:', to);

    const conditions = {
        login: user.login,
        checkin_at: {
            [Op.gte]: from
        },
        checkout_at: {
            [Op.lt]: to
        },
        deleted_at: {
            [Op.eq]: null as Date
        }
    };

    const usages = await Usages.findAll({
        where: conditions,
        order: [ ['checkin_at', 'ASC'] ],
    });

    return { list: usages };
};
