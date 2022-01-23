import {Controller, Get, Route} from 'tsoa';
import logger from "@modules/logger";
import * as ClusterService from "@service/cluster.service";
import httpStatus from "http-status";
import {errorHandler} from "@modules/error";
import ApiError from "@modules/api.error";

export interface Cluster {
    gaepo: number,
    seocho: number
}

@Route('v1/cluster')
export class ClusterController extends Controller {
    /**
     * 클러스터 상태조회
     */
    @Get('using')
    public async using(): Promise<Cluster> {
        try {
            const result = await ClusterService.getClustersUsing();

            this.setStatus(httpStatus.OK)
            logger.res(httpStatus.OK, result);
            return result;
        } catch (e) {
            logger.error(e);
            const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
            errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), null, null, null);
        }
    };

}

export async function ClusterUsing(req, res, next) {
    try {
        const controller = new ClusterController();
        const result = await controller.using();

        res.status(controller.getStatus() || httpStatus.OK).json(result);
    } catch (e) {
        logger.error(e);
        const statusCode = e.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        errorHandler(new ApiError(statusCode, e.message, {stack:e.stack, isFatal: true}), req, res, () => {});
    }
}