import { Users } from "../../src/models/users"
import { getAuth } from "../../src/service/auth.service";

export const getUserLoginName = () => {
    return 'ohjongin';
}

export const getCookie = async () => {
    const user = await Users.findOne({ where: { login: getUserLoginName() } })
    const { token } = await getAuth(user);
    return `w_auth_local=${token}`
}

export const getUserId = async () => {
    const user = await Users.findOne({ where: { login: getUserLoginName() } })
    return user?._id;
}
