export class ResJson<T> {
    status: number;
    code: number;
    result: boolean;
    message? : string;
    payload? : T;

    constructor (
        status: number,
        code: number,
        result: boolean,
        message?: string,
        payload?: T,
    ){
        /**
        * HTTP status code
        **/
        this.status = status;

        /**
         * API Result code
         */
        this.code = code;

        /**
         * Checkin result is Success or Fail
         */
        this.result = result;

        /**
         * Result message
         */
        if (message) this.message = message;

        /**
         * Additional Data
         */
        if (payload) this.payload = payload;
    }
}

export class ErrorJson {
    status: number;
    code: number;
    result: boolean;
    message: string;
    stack?: string;

    constructor(status: number, code: number, result:boolean, message: string, stack?:string){
        this.status = status;
        this.code = code;
        this.result = result;
        this.message = message;
        if (stack) this.stack = stack;
    }
}
