import { getTimezoneDateString} from "@modules/utils";
import * as configService from "@service/config.service";
import axios from "axios";
import logger from "@modules/logger";
import {Users} from "@models/users";
import {Op, Sequelize} from "sequelize";

/**
 * 42 intra 장애가 잦아서 slack 로그인 전환 여부 확인을 위한 health check
 */
export const check42Intra = async () => {
    let strategy;
    const today = getTimezoneDateString(new Date());
    let config = await configService.getConfigByDate(today, '42checkin_no_logging');
    try {
        let user = await Users.findOne({
            where: {
                profile: {
                    [Op.eq]: null
                }
            }
        })
        logger.log('No profile:', user);

        if (!user) {
            user = await Users.findOne({
                where: Sequelize.where(Sequelize.fn('JSON_LENGTH', Sequelize.col('profile')), '0')
            })
            logger.log('Profile empty:', user);
        }

        // await axios.get(`/v2/users/${user.login}`, {
        //     headers: {
        //     },
        // });

        const res = await axios.get('https://intra.42.fr');
        strategy = res.status === 200 ? '42' : 'Slack';
    } catch (e) {
        logger.error(e);
        strategy = 'Slack';
    }

    if (config?.auth !== strategy) {
        await configService.setConfigByDate(today,{
            auth: strategy
        });
    }
}
