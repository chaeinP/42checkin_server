import {Router} from 'express';
import passport from "passport";
import {getConfigRouter, setConfigRouter} from "@controllers/v1/config.controller";

export const path = '/config';
export const router = Router();

router.get('/', getConfigRouter);
router.put('/', passport.authenticate('jwt'), setConfigRouter);
