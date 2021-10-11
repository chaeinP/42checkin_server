import logger from "../../src/modules/logger"
import {errorHandler} from "../../src/modules/error";
import ApiError from "../../src/modules/api.error";
import httpStatus from "http-status";

function main() {
    // @ts-ignore
    errorHandler(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'e.message', {stack:new Error().stack, isFatal: true}));
}

main();
