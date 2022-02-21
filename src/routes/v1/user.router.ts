import {Router} from 'express';
import passport from 'passport';
import {GuestWiFiIpFilter} from '@modules/ip.filter';
import {CheckIn, CheckOut, Status, UserUsageList, UserUsageDaily, ForceCheckOut} from '@controllers/v1/user.controller';

export const path = '/user';
export const router = Router();

router.post('/checkIn/:cardId', passport.authenticate('jwt'), GuestWiFiIpFilter, CheckIn);
router.post('/checkOut', passport.authenticate('jwt'), CheckOut);
router.get('/status', passport.authenticate('jwt'), Status);
router.get('/usage', passport.authenticate('jwt'), UserUsageList);
router.get('/usage/daily', passport.authenticate('jwt'), UserUsageDaily);
router.post('/forceCheckout/:userId', passport.authenticate('jwt'), ForceCheckOut);
