import {Router} from "express";
import {CheckController} from "@controllers/check.contoller";

export const path = '/check';
export const router = Router();

router.get('/health', async function healthCheck(req, res, next) {
    const controller = new CheckController();
    const response = await controller.getHealth();
    return res.status(<number>controller.getStatus()).send(response);
})

router.get('/disk', async function diskCheck(req, res, next) {
    const controller = new CheckController();
    const response = await controller.getDisk();
    return res.status(<number>controller.getStatus()).send(response);
})

router.get('/auth', async function authCheck(req, res, next) {
    const controller = new CheckController();
    const response = await controller.authCheck(req, res, next);
    return res.status(<number>controller.getStatus()).send(response);
})