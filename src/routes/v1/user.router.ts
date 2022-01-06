import {Router} from 'express';
import passport from 'passport';
import * as UserStatus from '@controllers/user.status';
import {GuestWiFiIpFilter} from '@modules/ip.filter';
import {CheckInRouter, CheckOutRouter, StatusRouter} from '@controllers/v1/user.controller';
import {ClusterUsingRouter} from "@controllers/v1/cluster.controller";

export const path = '/user';
export const router = Router();

router.post('/checkIn/:cardId', passport.authenticate('jwt'), GuestWiFiIpFilter, CheckInRouter);
router.post('/checkOut', passport.authenticate('jwt'), CheckOutRouter);
router.get('/status', passport.authenticate('jwt'), StatusRouter);
router.get('/using', ClusterUsingRouter);
router.get('/usage', passport.authenticate('jwt'), UserStatus.userUsageList);
router.get('/usage/daily', passport.authenticate('jwt'), UserStatus.userUsageDaily);
router.post('/forceCheckout/:userId', passport.authenticate('jwt'), UserStatus.forceCheckout);