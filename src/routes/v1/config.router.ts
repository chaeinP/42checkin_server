import {Router} from 'express';
import passport from "passport";
import {getConfig, setConfig} from "@controllers/v1/config.controller";

export const path = '/config';
export const router = Router();

router.get('/', getConfig);
router.put('/', passport.authenticate('jwt'), setConfig);
