import {Op} from 'sequelize';
import {CHECK_STATE, CLUSTER_TYPE} from '@modules/cluster';
import {Users} from '@models/users';
import {getTimezoneDateTimeString} from '@modules/utils';
import * as configService from '@service/config.service';
import {Cluster} from "@controllers/v1/cluster.controller";

/**
 * 두 클러스터의 사용중인 카드의 카운트를 가져온다
 */
export const getClustersUsing = async (): Promise<Cluster> => {
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
    const enterCnt = (await getClustersUsing())[clusterType];
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
