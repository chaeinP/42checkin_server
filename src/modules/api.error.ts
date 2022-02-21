Error.stackTraceLimit = 10
export default class ApiError extends Error {
	statusCode: number;
    apiCode : number;
	isFatal: boolean; // 명시적으로 Fatal 오류임을 지정하면 slack으로 오류 발송
    isNormal: boolean; // 명시적으로 Normal 오류를 설정하지 않으면 에상치 않은 오류이므로 오류 발송
	constructor(statusCode: number, apiCode: any, message: string, option?: { stack?: string, isFatal?: boolean, isNormal?: boolean }) {
		super(message);
		this.statusCode = statusCode;
        this.apiCode = apiCode ? apiCode : statusCode * 10;
		if (option) {
			this.isFatal = option.isFatal === undefined ? false : option.isFatal;
            this.isNormal = option.isNormal === undefined ? false : option.isNormal;
			if (option.stack) {
				this.stack = option.stack;
			} else {
				Error.captureStackTrace(this, this.constructor);
			}
		} else {
			this.isFatal = false;
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

