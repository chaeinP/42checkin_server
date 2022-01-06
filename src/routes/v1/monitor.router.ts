import {Router} from "express";
import {MonitorController} from "@controllers/v1/monitor.contoller";
import logger from "@modules/logger";
import httpStatus from "http-status";
import {errorHandler} from "@modules/error";
import ApiError from "@modules/api.error";

export const path = '/monitor';
export const router = Router();

router.get('/health', async function healthCheck(req, res, next) {
    try {
        const controller = new MonitorController();
        const result = await controller.getHealth();

        res.status(controller.getStatus()).json(result);
    } catch (e) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }

});
router.get('/disk', new MonitorController().getDisk);
router.get('/auth', new MonitorController().getAuth);