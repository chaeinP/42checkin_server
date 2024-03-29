import jwt from 'jsonwebtoken';

import {IUser} from "@models/users";
import * as userService from '@service/user.service';
import env from '@modules/env';

export const getAuth = async (user: IUser) => {
	const token = await userService.login(user);
	const decoded = jwt.decode(token) as any;
	const cookieOption: { domain?: string; expires: any } = {
		expires: new Date(decoded.exp * 1000)
	};
	cookieOption.domain = env.url.root_host;
	return {
		token, cookieOption
	}
}
