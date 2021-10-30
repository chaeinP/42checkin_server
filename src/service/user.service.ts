import httpStatus from 'http-status';
import { Op } from 'sequelize';
import { generateToken, IJwtUser } from '@modules/strategy.jwt';
import logger from '@modules/logger';
import ApiError from '@modules/api.error';
import { CHECK_STATE, CLUSTER_CODE, CLUSTER_TYPE } from '@modules/cluster';
import { Users } from '@models/users';
import { noticer } from '@modules/discord';
import { getLocalDate } from '@modules/util';
import * as historyService from '@service/history.service';
import * as configService from '@service/config.service';
import * as usageService from '@service/usage.service';
import axios from "axios";

/**
 * 미들웨어에서 넘어온 user정보로 JWT token 생성
 * */
export const login = async (user: Users): Promise<string> => {
    logger.log('login:', user);
    const found = await Users.findOne({
        where: {
            login: user.login,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });

    //처음 사용하는 유저의 경우 db에 등록
    if (!found) {
        await user.save();
        logger.log('User created:', user);
    } else if (found.email !== user.email) {
        found.email = user.email;
        await found.save();
    }

    const u = found ? found : user;

    return generateToken(u);
};

/**
 * 어드민 여부 확인
 */
export const requestAdminPrivilege = async (id: number) => {
    const user = await Users.findOne({
        where: {
            _id: id,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });
    logger.log('IsAdmin:', user.type);
    if (user.type !== 'admin') {
        let msg = '관리자 권한이 필요한 접근입니다.'
        throw new ApiError(httpStatus.FORBIDDEN, msg, {stack: new Error(msg).stack});
    }
    return true;
};

/**
 * 사용자 정보
 */
export const getUser = async (id: number) => {
    const user = await Users.findOne({
        where: {
            _id: id,
            deleted_at: {
                [Op.eq]: null
            }
        }
    })
    return user;
};

/**
 * 유저 및 카드 체크인 처리
 */
export const checkIn = async (userInfo: IJwtUser, cardId: string) => {
    logger.log('userInfo: ', userInfo, ', cardId: ', cardId);
    if (!userInfo) {
        throw new ApiError(httpStatus.UNAUTHORIZED, '유저 정보 없음', {stack: new Error().stack});
    }
    const userId = userInfo._id;
    const _cardId = parseInt(cardId);
    let notice = false;
    const cardOwner = await Users.findOne({
        where: {
            card_no: cardId,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });
    if (cardOwner) {
        logger.error(`이미 사용중인 카드입니다, cardOwner: ${JSON.stringify(cardOwner)}`);
        throw new ApiError(httpStatus.CONFLICT, '이미 사용중인 카드입니다.', {stack: new Error().stack});
    }
    const user = await Users.findOne({
        where: {
            _id: userId,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });
    const clusterType = user.getClusterType(_cardId)
    const { enterCnt, maxCnt, result } = await checkCanEnter(clusterType, 'checkIn'); //현재 이용자 수 확인

    logger.log('login: ', user.login, 'card_no: ', _cardId, 'max: ', maxCnt, 'used: ', enterCnt);
    if (!result) {
        logger.error({use: enterCnt, max: maxCnt});
        throw new ApiError(httpStatus.CONFLICT, '수용할 수 있는 최대 인원을 초과했습니다.', {stack: new Error().stack});
    }

    // Users table에 log_id를 남기면서 순서가 뒤바뀌어서 card_no가 null이 되는 현상이 발생.
    // card_no를 user에 미리 세팅하고 history 생성한다.
    user.card_no = _cardId;
    let history = await historyService.create(user, 'checkIn');
    await user.setState('checkIn', user.login, _cardId, history._id);
    // 남은 인원이 5명이하인 경우, 몇 명 남았는지 디스코드로 노티
    if (enterCnt + 1 >= maxCnt - 5) {
        try {
            await noticer(CLUSTER_CODE[clusterType], maxCnt - enterCnt + 1);
            notice = true;
        } catch (e) {
            logger.error(e);
        }
    }

    return {
        result: true,
        notice
    };
};

/**
 * 유저 및 카드 체크아웃 처리
 */
export const checkOut = async (userInfo: IJwtUser) => {
    logger.log('userInfo: ', userInfo);
    if (!userInfo) {
        throw new ApiError(httpStatus.UNAUTHORIZED, '유저 정보 없음', {stack: new Error().stack});
    }
    const id = userInfo._id;
    const user = await Users.findOne({
        where: {
            _id: id,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });

    await usageService.create(user, user.login);
    let history = await historyService.create(user, 'checkOut');
    const clusterType = user.getClusterType(user.card_no)
    await user.setState('checkOut', user.login, null, history._id);

    const { enterCnt, maxCnt } = await checkCanEnter(clusterType); //현재 이용자 수 확인
    // 남은 인원이 5명이하인 경우, 몇 명 남았는지 디스코드로 노티
    if (enterCnt >= maxCnt - 5) {
        try {
            await noticer(CLUSTER_CODE[clusterType], maxCnt - enterCnt - 1);
        } catch (e) {
            logger.error(e);
        }
    }
    const _user = Object.assign(user);
    delete _user['profile'];
    logger.info('checkOut', JSON.stringify(_user));

    return true;
};

/**
 * 유저 및 클러스터 상태 조회
 */
export const status = async (userInfo: IJwtUser) => {
    if (!userInfo) {
        logger.error('IJwtUser is null !!');
        let msg = '유저 정보 없음';
        throw new ApiError(httpStatus.UNAUTHORIZED, msg, {stack: new Error(msg).stack});
    }
    const id = userInfo._id;
    const user = await Users.findOne({
        where: {
            '_id': id,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });
    if (!user) {
        logger.error('userInfo:', userInfo);
        let msg = 'DB에서 사용자를 찾지 못했습니다.';
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, msg, {stack:new Error(msg).stack});
    }

    let rawProfile: any;
    try {
        rawProfile = JSON.parse(user.profile._raw);
    } catch (e) {
        logger.error(e);
    }

    let imageUrl = rawProfile?.image_url;
    if (!imageUrl) {
        let url = `https://cdn.intra.42.fr/users/${user.login}.jpg`;
        let res = await axios.get(url);
        imageUrl = (res.status === 200) ? url : `https://cdn.intra.42.fr/users/default.png`;
    }

    return {
        user: {
            login: user.login,
            card: user.card_no,
            profile_image_url: imageUrl
        },
        cluster: await getUsingInfo(),
        isAdmin: user.type === 'admin'
    };
};

/**
 * 강제 체크아웃
 */
export const forceCheckOut = async (adminInfo: IJwtUser, userId: string) => {
    if (!adminInfo) {
        let msg = '관리자 권한이 필요한 접근입니다.'
        throw new ApiError(httpStatus.UNAUTHORIZED, msg, {stack: new Error(msg).stack, isNormal: true});
    }
    await requestAdminPrivilege(adminInfo._id);
    const _userId = parseInt(userId);
    const user = await Users.findOne({
        where: {
            _id: _userId,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });
    if (!user) {
        let msg = `사용자 정보(${_userId})가 없습니다.`;
        throw new ApiError(httpStatus.UNAUTHORIZED, msg, {stack: new Error(msg).stack, isNormal: true});
    }
    if (user.card_no === null) {
        let msg = `이미 체크아웃한 사용자입니다.`;
        throw new ApiError(httpStatus.BAD_REQUEST, msg, {stack: new Error(msg).stack, isNormal: true});
    }
    await usageService.create(user, adminInfo.name);
    await historyService.create(user, 'forceCheckOut');
    logger.error({
        type: 'action',
        message: 'return card',
        data: { user: user.toJSON() },
    });
    const clusterType = user.getClusterType(user.card_no)
    await user.setState('checkOut', adminInfo.name);
    const { enterCnt, maxCnt } = await checkCanEnter(clusterType); //현재 이용자 수 확인
    // 남은 인원이 5명이하인 경우, 몇 명 남았는지 디스코드로 노티
    if (enterCnt >= maxCnt - 5) {
        await noticer(CLUSTER_CODE[clusterType], maxCnt - enterCnt - 1);
    }
    return user;
};

/**
 * 두 클러스터의 사용중인 카드의 카운트를 가져온다
 */
export const getUsingInfo = async () => {
    const gaepo = await Users.count({
        where: {
            card_no: {
                [Op.lt]: 1000,
                [Op.gt]: 0
            },
            deleted_at: {
                [Op.eq]: null
            }
        }
    })
    const seocho = await Users.count({
        where: {
            card_no: {
                [Op.gte]: 1000
            },
            deleted_at: {
                [Op.eq]: null
            }
        }
    })
    // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
    return {
        [CLUSTER_CODE[0]]: gaepo,
        [CLUSTER_CODE[1]]: seocho
    };
}

/**
 * 입장가능여부 판별 및 최대입장인원수 반환
 * @param clusterType 클러스터 타입
 * @param checkType
 * @returns
 */
const checkCanEnter = async (clusterType: CLUSTER_TYPE, checkType?: CHECK_STATE) => {
    const enterCnt = (await getUsingInfo())[clusterType];
    // 최대인원을 넘었으면 다 찼으면 체크인 불가
    const config = await configService.getConfig(getLocalDate(new Date()).toISOString());
    const maxCnt = config[clusterType];
    return {
        enterCnt,
        maxCnt,
        result: (checkType && checkType === 'checkIn' ? 1 : 0) + enterCnt <= maxCnt
    }
}
