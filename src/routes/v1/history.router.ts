
import { Router } from 'express';
import passport from "passport";
import { GetCardHistory, GetUserHistory, GetGaepoHistory, GetSeochoHistory, GetCheckInUsers } from '@controllers/v1/history.controller';
import { adminCheck } from '@modules/admin';

export const router = Router();
export const path = '/log';

router.get('/card/:id', passport.authenticate('jwt'), adminCheck, GetCardHistory);
router.get('/user/:login', passport.authenticate('jwt'), adminCheck, GetUserHistory);
router.get('/gaepo', passport.authenticate('jwt'), adminCheck, GetGaepoHistory);
router.get('/seocho', passport.authenticate('jwt'), adminCheck, GetSeochoHistory);
router.get('/CheckIn/:type', passport.authenticate('jwt'), /*adminCheck,*/ GetCheckInUsers);
