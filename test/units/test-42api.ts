// noinspection DuplicatedCode

import {Users} from "../../src/models/users";
import {Op, Sequelize} from "sequelize";
import logger from "../../src/modules/logger";
import axios from "axios";


(async () => {
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

    await axios.get(`/v2/users/${user.login}`, {
        headers: {
        },
    });

})();