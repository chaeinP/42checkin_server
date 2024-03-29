import httpStatus from 'http-status';
import {Op} from 'sequelize';
import {generateToken, IJwtUser} from '@modules/strategy.jwt';
import logger from '@modules/logger';
import ApiError from '@modules/api.error';
import { CHECK_STATE, CLUSTER_CODE, CLUSTER_TYPE } from '@modules/cluster';
import {IUser, Users} from '@models/users';
import { noticer } from '@modules/discord';
import {getTimeNumber, getTimezoneDate, getTimezoneDateString, getTimezoneDateTimeString} from '@modules/utils';
import * as historyService from '@service/history.service';
import * as configService from '@service/config.service';
import * as usageService from '@service/usage.service';
import axios from "axios";
import {CheckInRes, CheckOutResponse, UserStatusResponse} from "@controllers/v1/user.controller";
import {apiStatus} from '@modules/api.status'
import {getConfigByDate} from "@service/config.service";

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
 * 특정 시간이 최소 시간과 최대 시간 사이에 있는지 검사한다
 * @param target 확인하려는 시간 문자열 ex) '12:00'
 * @param min 최소 시간
 * @param max 최대 시간
 *
 * @return boolean 시간이 범위에 있는지 여부
 */
const isBetween = (target: string, min: any, max: any) => {
    let now = getTimeNumber(target);
    let checkin_at = (min !== null && min !== undefined) ? getTimeNumber(min) : -1;
    let checkout_at = (max !== null && max !== undefined) ? getTimeNumber(max) : Number.MAX_SAFE_INTEGER;

    let result = (now >= checkin_at) && (now < checkout_at);
    if (!result) {
        logger.log('now: ', now, ', checkin_at: ', checkin_at, ', checkout_at: ', checkout_at);
        logger.log('now: ', getTimeNumber(target), ', min: ', min, ', max: ', max);
    }

    return result;
}

export const isCheckAvailable = async () => {
    const today = getTimezoneDateString(new Date());
    const config = await getConfigByDate(today);
    if (!config) {
        let msg = `해당 날짜(${today})의 설정값이 서버에 존재하지 않습니다.`;
        logger.error(msg, 'date:', today, 'setting:', config);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, null, msg, {stack: new Error(msg).stack});
    }

    let now = getTimezoneDate(new Date()).toISOString().slice(11, 19);
    return isBetween(now, config.checkin_at, config.checkout_at);
}

/**
 * 어드민 여부 확인
 */
export const isAdmin = async (user: IUser) => {
    try {
        logger.log('isAdmin:', user?.type);
        return ['admin'].includes(user?.type!);
    } catch (e) {
        logger.error(e);
    }

    return null;
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

export const getCardOwner = async (cardId: number) => {
    return await Users.findOne({
        where: {
            card_no: cardId,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });
}

/**
 * 유저 및 클러스터 상태 조회
 */
export const status = async (userId : number): Promise<UserStatusResponse> => {
    const user = await Users.findOne({
        where: {
            '_id': userId,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });

    if (!user) {
        let msg = `해당 사용자(user._id : ${userId})가 존재하지 않습니다.`;
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, null, msg, {stack:new Error(msg).stack});
    }

    let rawProfile;
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
        //cluster: await getUsingInfo(),
        isAdmin: user.type === 'admin'
    };
};

/**
 * 강제 체크아웃
 */
export const forceCheckOut = async (jwt: IJwtUser, userId: number): Promise<CheckOutResponse> => {
    let notice = false;

    if (!jwt) {
        return {
            status: httpStatus.UNAUTHORIZED,
            result: false,
            code: apiStatus.USER_NOT_FOUND,
            message: `사용자 정보가 없습니다.`
        }
    }

    const user = await Users.findOne({
        where: {
            _id: userId,
            deleted_at: {
                [Op.eq]: null
            }
        }
    });
    if (!user) {
        return {
            status: httpStatus.UNAUTHORIZED,
            result: false,
            code: apiStatus.USER_NOT_FOUND,
            message: `사용자를 찾을 수 없습니다.`,
        }
    }

    if (!await isAdmin(user)) {
        return {
            status: httpStatus.FORBIDDEN,
            result: false,
            code: apiStatus.FORBIDDEN,
            message: '접근 권한이 없습니다.',
        }
    }

    if (user.card_no === null) {
        return {
            status: httpStatus.OK,
            result: true,
            code: apiStatus.CONFLICT,
            message: '체크아웃 상태입니다.',
        }
    }

    await usageService.create(user, jwt.name);
    await historyService.create(user, 'forceCheckOut');
    logger.log({
        type: 'action',
        message: 'return card',
        data: { user: user.toJSON() },
    });
    const clusterType = user.getClusterType(user.card_no)
    await user.setState('checkOut', jwt.name);

    const { enterCnt, maxCnt } = await checkCanEnter(clusterType); //현재 이용자 수 확인
    // 남은 인원이 5명이하인 경우, 몇 명 남았는지 디스코드로 노티
    if (enterCnt >= maxCnt - 5) {
        await noticer(CLUSTER_CODE[clusterType], maxCnt - enterCnt - 1);
        notice = true;
    }

    return {
        status: httpStatus.OK,
        result: true,
        code: apiStatus.OK,
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
export const checkCanEnter = async (clusterType: CLUSTER_TYPE, checkType?: CHECK_STATE) => {
    const enterCnt = (await getUsingInfo())[clusterType];
    // 최대인원을 넘었으면 다 찼으면 체크인 불가
    const today = getTimezoneDateTimeString(new Date()).slice(0,10);
    const config = await configService.getConfigByDate(today, 'checkCanEnter');
    const maxCnt = config[clusterType];
    return {
        enterCnt,
        maxCnt,
        result: (checkType && checkType === 'checkIn' ? 1 : 0) + enterCnt <= maxCnt
    }
}
