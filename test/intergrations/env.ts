import { Users } from "../../src/models/users"
import { getAuth } from "../../src/service/auth.service";
import {Op} from "sequelize";

export const getCookie = async () => {
    const user = await Users.findOne({
        where: {
            login: process.env.MOCHA_TEST_USER,
            deleted_at: {
                [Op.eq]: null
            }
        }
    })
    const { token } = await getAuth(user);
    return `w_auth_local=${token}`
}