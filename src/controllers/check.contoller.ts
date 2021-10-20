import {Get, Route} from "tsoa";

export interface IHealthStatus {
    status?: string;
    version?: string;
    message?: string;
}

@Route("healthCheck")
export class CheckController {
    @Get("/")
    public async checkHealth() : Promise<IHealthStatus> {
        return {
            message: "pong",
        };
        /*return Sequelize().authenticate()
            .then(async function SequelizeAuthCallback() {
                const pkg = require('../../package.json');
                return {
                    version: pkg?.version
                };
            })
            .catch(function SequelizeAuthCallback(err) {
                logger.error('Unable to connect to the database:', err);
                return {
                    status: 'fail',
                    message: err.message
                };
            });*/
    }
}