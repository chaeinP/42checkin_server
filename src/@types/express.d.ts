import { IJwtUser } from '@modules/strategy.jwt'
import { IUser } from '@models/users';

declare module "express" {
  export interface Request {
	clientIp?: string;
    user?: {
		jwt?: IJwtUser,
		ft?: IUser,
	}
    query: any
  }
}