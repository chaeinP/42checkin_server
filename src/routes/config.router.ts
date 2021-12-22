import {NextFunction, Request, Response, Router} from 'express';
import {ConfigController} from "@controllers/config.controller";
import httpStatus from "http-status";
import ApiError from "@modules/api.error";
import {errorHandler} from "@modules/error";
import passport from "passport";

export const path = '/config';
export const router = Router();

const getConfigRouter = async (req: Request, res: Response, next: NextFunction) => {
    const controller = new ConfigController();
    let response;
    let statusCode;

    try {
        response = await controller.getConfig(req?.query);
        statusCode = controller.getStatus();
    } catch (e) {
        statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }

    return res.status(statusCode).send(response);
}

const setConfigRouter = async (req: Request, res: Response, next: NextFunction) => {
    const controller = new ConfigController();
    let response;
    let statusCode;

    try {
        response = await controller.setConfig(req.body);
        statusCode = controller.getStatus();
    } catch (e) {
        statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, next);
    }

    return res.status(statusCode).send(response);
}

router.get('/', getConfigRouter);
router.put('/', passport.authenticate('jwt'), setConfigRouter);
