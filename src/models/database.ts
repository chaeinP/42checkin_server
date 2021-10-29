import sequelize from 'sequelize';
import type { ConfigAttributes, configCreationAttributes } from "./config";
import type { HistoryAttributes, historyCreationAttributes } from "./history";
import type { UsersAttributes, usersCreationAttributes } from "./users";
import type { UsageAttributes, usageCreationAttributes } from "./usages";

import { Config } from "./config";
import { History } from './history';
import { Users } from "./users";
import { Usages } from "./usages";

import env from '@modules/env';
import logger from "../modules/logger";

/*
sequelize-auto -o "./models" -d checkin_dev -h localhost -u root -p  -x XXXX -e mysql -l ts
 */
const {host, username, password, name, port} = env.database;
const database = new sequelize.Sequelize(name, username, password, {
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
        if (query?.includes('42checkin_no_logging')) return;
        if (query?.includes('SELECT 1+1 AS result')) return;
        logger.sql(query);
    }
});

database
    .authenticate()
    .then(function onSequelizeAuthSuccess() {
        logger.log('Connection has been established successfully.');
    })
    .catch(function onSequelizeAuthError (err) {
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
    Config.initModel(database);
    History.initModel(database);
    Users.initModel(database);
    Usages.initModel(database);

    History.belongsTo(Users, { foreignKey: 'login', targetKey: 'login' });
    Users.hasMany(History, { foreignKey: 'login', sourceKey: 'login' });

    return database;
}

Sequelize();