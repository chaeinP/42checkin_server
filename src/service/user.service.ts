import httpStatus from 'http-status';
import {Op} from 'sequelize';
import {generateToken, IJwtUser} from '@modules/strategy.jwt';
import logger from '@modules/logger';
import ApiError from '@modules/api.error';
import { CHECK_STATE, CLUSTER_CODE, CLUSTER_TYPE } from '@modules/cluster';
import {IUser, Users} from '@models/users';
import { noticer } from '@modules/discord';
import {getTimezoneDateString} from '@modules/util';
import * as historyService from '@service/history.service';
import * as configService from '@service/config.service';
import * as usageService from '@service/usage.service';
import axios from "axios";
import {ICheckInResponse, IUserStatusResponse} from "@controllers/v1/user.controller";

/**
 * 미들웨어에서 넘어온 user정보로 JWT token 생성
 * */
export const login = async (user: IUser): Promise<string> => {
    logger.log('user:', JSON.stringify(user));
    let found = await Users.findOne({
        where: {
            login: user.login,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });

    // 처음 사용하는 유저의 경우 db에 등록
    if (!found) {
        found = await Users.create({
            login: user.login,
            type: user.type,
            email: user.email,
            access_token: user.access_token,
            refresh_token: user.refresh_token,
            profile: user.profile,
            created_at: new Date()
        });
        await found.save();
        logger.log('User created:', found);
    } else {
        logger.log('User login:', found);
    }

    return generateToken(found);
};

/**
 * 어드민 여부 확인
 */
export const isAdmin = async (id: number) => {
    try {
        const user = await Users.findOne({
            where: {
                _id: id,
                deleted_at: {
                    [Op.eq]: null
                }
            }
        });
        logger.log('isAdmin:', user?.type);
        return ['admin'].includes(user?.type);
    } catch (e) {
        logger.error(e);
    }

    return null;
};

/**
 * 어드민 여부 확인
 */
export const assertAdminPrivilege = async (id: number) => {
    if (!await isAdmin(id)) {
        let msg = '관리자 권한이 필요한 접근입니다.'
        throw new ApiError(httpStatus.FORBIDDEN, msg, {stack: new Error(msg).stack});
    }
    return true;
};

/**
 * 사용자 정보
 */
export const getUserById = async (id: number) => {
    return await Users.findOne({
        where: {
            _id: id,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });
};

/**
 * 유저 및 카드 체크인 처리
 */
export const checkIn = async (userId: number, cardId: number): Promise<ICheckInResponse> => {
    let notice = false;

    logger.log('userId: ', userId, ', cardId: ', cardId);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, '유저 정보 없음', {stack: new Error().stack});
    }

    const user = await getUserById(userId);
    const userPrevState = user?.state;
    if (['checkin'].includes(user.state?.toLowerCase())) {
        return {
            result: true,
            card_no: cardId,
            prev_state: userPrevState,
            state: 'checkIn',
            notice: false
        };
    }

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

    const clusterType = user.getClusterType(cardId)
    const { enterCnt, maxCnt, result } = await checkCanEnter(clusterType, 'checkIn'); //현재 이용자 수 확인

    logger.log('login: ', user.login, 'card_no: ', cardId, 'max: ', maxCnt, 'used: ', enterCnt);
    if (!result) {
        logger.error({use: enterCnt, max: maxCnt});
        throw new ApiError(httpStatus.CONFLICT, `[${enterCnt}/${maxCnt}]클러스터 출입 최대 인원을 초과했습니다.`, {stack: new Error().stack, isFatal:true});
    }

    // Users table에 log_id를 남기면서 순서가 뒤바뀌어서 card_no가 null이 되는 현상이 발생.
    // card_no를 user에 미리 세팅하고 history 생성한다.
    user.card_no = cardId;
    let history = await historyService.create(user, 'checkIn');
    await user.setState('checkIn', user.login, cardId, history._id);

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
        card_no: cardId,
        prev_state: userPrevState,
        state: user.state,
        notice: notice
    };
};

/**
 * 유저 및 카드 체크아웃 처리
 */
export const checkOut = async (userId: number) => {
    logger.log('userId: ', userId);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, '유저 정보 없음', {stack: new Error().stack});
    }

    const user = await Users.findOne({
        where: {
            _id: userId,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });

    const _user = Object.assign(user);
    _user['profile'] = {};
    logger.info('checkOut', JSON.stringify(_user));

    if (!['checkin'].includes(user.state?.toLowerCase())) {
        throw new ApiError(httpStatus.BAD_REQUEST, '이미 체크아웃 하셨습니다.', {stack: new Error().stack});
    }

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

    logger.info('checkOut', JSON.stringify(user));
    return {
        result: true,
    };
};

/**
 * 유저 및 클러스터 상태 조회
 */
export const status = async (userInfo: IJwtUser): Promise<IUserStatusResponse> => {
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
        let res;

        try {
            res = await axios.get(url);
        } catch (e) {
            logger.error(`${url} not found... use default...`);
        }
        imageUrl = (res?.status === 200) ? url : `https://cdn.intra.42.fr/users/default.png`;
    }

    return {
        user: {
            login: user.login,
            card: user.card_no,
            state: user.state,
            log_id: user.log_id,
            checkin_at: user.checkin_at,
            checkout_at: user.checkout_at,
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
    await assertAdminPrivilege(adminInfo._id);
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
    return {
        result: true,
    };
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
        'gaepo': gaepo,
        'seocho': seocho
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
    const today = getTimezoneDateString(new Date()).slice(0,10);
    const config = await configService.getConfigByDate(today, 'checkCanEnter');
    const maxCnt = config[clusterType];
    return {
        enterCnt,
        maxCnt,
        result: (checkType && checkType === 'checkIn' ? 1 : 0) + enterCnt <= maxCnt
    }
}
