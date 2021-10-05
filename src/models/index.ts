import database from 'sequelize';
import type { ConfigAttributes, configCreationAttributes } from "./config";
import type { HistoryAttributes, historyCreationAttributes } from "./history";
import type { UsersAttributes, usersCreationAttributes } from "./users";
import type { UsageAttributes, usageCreationAttributes } from "./usage";

import { Config } from "./config";
import { History } from './history';
import { Users } from "./users";
import { Usage } from "./usage";

import env from '@modules/env';
import logger from "../modules/logger";

/*
sequelize-auto -o "./models" -d checkin_dev -h localhost -u root -p  -x XXXX -e mysql -l ts
 */
const {host, username, password, name, port} = env.database;
const sequelize = new database.Sequelize(name, username, password, {
    host: host,
    dialect: 'mysql',
    port,
    define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_general_ci',
        freezeTableName: true
    },
    timezone: '+09:00',
    logQueryParameters: process.env.NODE_ENV === 'development',
    logging: (query) => {
        logger.sql(query);
    }
});

sequelize
    .authenticate()
    .then(() => {
        logger.info('Connection has been established successfully.');
    })
    .catch(err => {
        logger.error('Unable to connect to the database:', err);
    });

export {
    Config,
    History,
    Users,
    sequelize
};

export type {
    ConfigAttributes,
    configCreationAttributes,
    HistoryAttributes,
    historyCreationAttributes,
    UsersAttributes,
    usersCreationAttributes,
    UsageAttributes,
    usageCreationAttributes,
};

export function Sequelize() {
    Config.initModel(sequelize);
    History.initModel(sequelize);
    Users.initModel(sequelize);
    Usage.initModel(sequelize);
    return sequelize;
}
