import { Controller, Get, Route, Tags, Example, Response } from "tsoa";
import { RequestHandler } from "express";
import logger from "@modules/logger";
import * as ClusterService from "@service/cluster.service";
import httpStatus from "http-status";
import { errorHandler } from "@modules/error";
import ApiError from "@modules/api.error";
import { ResJson } from "@modules/response";
import { apiStatus } from "@modules/api.status";

export interface Cluster {
    gaepo: number;
    seocho: number;
}

@Route("v1/cluster")
@Tags("Cluster")
export class ClusterController extends Controller {
    /**
     * 클러스터 좌석 수 조회
     */
    @Example<ResJson<Cluster>>({
        status: 200, /* OK */
        code: 2000, /* OK */
        result: true,
        payload: {
            gaepo: 135,
            seocho: 110
        }
    })
    @Response<ResJson<null>>(500, "Internal Server Error", {
        status: 500, /* INTERNAL_SERVER_ERROR */
        code: 5000, /* INTERNAL_SERVER_ERROR */
        result: false,
        message: "서버 오류입니다.\n잠시 후 재시도하시거나,\n증상이 계속되면 관리자(slack:@ohjongin)에게 문의하세요."
    })
    @Get("using")
    public async using(): Promise<ResJson<Cluster>> {
        const payload = await ClusterService.getClustersUsing();
        const response = new ResJson<Cluster>(httpStatus.OK, apiStatus.OK, true, null, payload);
        this.setStatus(httpStatus.OK);
        return response;
    }
}

export const ClusterUsing: RequestHandler = async (req, res, next) => {
    try {
        const controller = new ClusterController();
        const response = await controller.using();

        logger.res(httpStatus.OK, response);
        res.status(await controller.getStatus() || httpStatus.OK).json(response);
    } catch (e) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, null, e.message, { stack: e.stack, isFatal: true }), req, res, next);
    }
}
