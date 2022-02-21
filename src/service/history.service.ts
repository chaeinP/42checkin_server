import httpStatus from 'http-status';
import Sequelize, {Op} from 'sequelize';

import {Users} from '@models/users';
import {History} from '@models/history';

import {CLUSTER_CODE, clusterCondition} from '@modules/cluster';
import logger from '@modules/logger';
import ApiError from '@modules/api.error';
import {now} from '@modules/utils';

/**
 * 유저의 로그정보를 조회한다.
 */
export const getUserHistory = async (login: string, page: number, listSize: number) => {
    logger.log('user:', login);
    const {rows, count} = await History.findAndCountAll({
        include: [{
            model: Users,
            attributes: ['state', '_id', 'login', 'card_no', 'log_id'],
        }],
        where: {
            login,
            deleted_at: {
                [Op.eq]: null
            },
            [Op.and]: [
                Sequelize.literal('`User`.`login` = `History`.`login`'),
            ],
        },
        order: [['_id', 'DESC']],
        offset: listSize * (page - 1),
        limit: listSize,
    });
    return {list: rows, lastPage: Math.ceil(count / listSize)};
};

/**
 * 카드의 로그정보를 조회한다.
 */
export const getCardHistory = async (id: number, page: number, listSize: number) => {
    logger.log('card_no:', id);
    const {rows, count} = await History.findAndCountAll({
        include: [{
            model: Users,
            attributes: ['state', '_id', 'login', 'card_no', 'log_id'],
        }],
        where: {
            card_no: id,
            deleted_at: {
                [Op.eq]: null
            },
            [Op.and]: [
                Sequelize.literal('`User`.`login` = `History`.`login`'),
            ],
        },
        order: [['_id', 'DESC']],
        offset: listSize * (page - 1),
        limit: listSize,
    });
    return {list: rows, lastPage: Math.ceil(count / listSize)};
};

/**
 * 로그정보를 생성한다.
 */
export const create = async (user: Users, type: string): Promise<History> => {
    logger.log('user:', user.login, ', card_no: ', user.card_no, ', type: ', type);
    const log = await History.create({
        login: user.login,
        card_no: user.card_no,
        type,
        created_at: now().toDate()
    });

    return await log.save();
};

/**
 * 클러스터별 로그정보를 조회한다.
 */
export const getCluster = async (clusterType: CLUSTER_CODE, page: number, listSize: number) => {
    if (!CLUSTER_CODE[clusterType]) {
        let msg = `존재하지 않는 클러스터 코드(${clusterType})입니다.`;
        throw new ApiError(httpStatus.NOT_FOUND, null, msg, {stack: new Error(msg).stack});
    }
    logger.log('clusterType:', clusterType, 'cluster:', CLUSTER_CODE[clusterType], 'page:', page, 'listSize:', listSize);

    page = isNaN(page) ? 1 : page;
    listSize = isNaN(listSize) ? 50 : listSize;

    /*
        const { rows, count } = await History.findAndCountAll({
        include: [{
            model: Users,
            attributes: ['state', '_id', 'login', 'card_no'],
        }],
        where: {
            card_no: clusterCondition[clusterType],
            [Op.and]: [
                Sequelize.literal('`User`.`login` = `History`.`login`'),
            ],
        },
        order: [ [ '_id', 'DESC' ] ],
        offset: listSize * (page - 1),
        limit: listSize
    });
     */
    const {rows, count} = await History.findAndCountAll({
        include: [{
            model: Users,
            attributes: ['state', '_id', 'login', 'card_no', 'log_id'],
        }],
        where: {
            card_no: clusterCondition[clusterType],
            deleted_at: {
                [Op.eq]: null
            },
            [Op.and]: [
                Sequelize.literal('`User`.`login` = `History`.`login`'),
            ]
        },
        order: [['_id', 'DESC']],
        offset: listSize * (page - 1),
        limit: listSize,
    });

    logger.log(JSON.stringify(rows), count, listSize);
    return {list: rows, lastPage: Math.ceil(count / listSize)};
};

/**
 * 특정 클러스터의 미반납카드를 조회한다.
 */
export const getCheckIn = async (clusterType: CLUSTER_CODE, page: number, listSize: number) => {
    if (!CLUSTER_CODE[clusterType]) {
        let msg = `존재하지 않는 클러스터 코드(${clusterType})입니다.`;
        throw new ApiError(httpStatus.NOT_FOUND, null, msg, {stack: new Error(msg).stack});
    }
    logger.log('clusterType:', clusterType, ',cluster:', CLUSTER_CODE[clusterType], ',page:', page, ',listSize:', listSize);

    page = isNaN(page) ? 1 : page;
    listSize = isNaN(listSize) ? 50 : listSize;

    const {rows, count} = await Users.findAndCountAll({
        attributes: ['_id', ['checkin_at', 'created_at'], 'state', 'login', 'card_no', 'log_id'],
        where: Sequelize.and(
            {
                card_no: clusterCondition[clusterType],
            },
            {
                deleted_at: {
                    [Op.eq]: null
                }
            },
            {
                card_no: {
                    [Op.ne]: null
                }
            }),
        order: [['_id', 'DESC']],
        offset: listSize * (page - 1),
        limit: listSize,
    });

    return {list: rows, lastPage: Math.ceil(count / listSize)};
};

