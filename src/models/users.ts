import { CHECK_STATE, CLUSTER_CODE, CLUSTER_TYPE } from '@modules/cluster';
import { now } from '@modules/util';
import * as Sequelize from 'sequelize';
import {Association, DataTypes, Model, Optional} from 'sequelize';
import { History } from './history';
import logger from "@modules/logger";

export interface UsersAttributes {
    _id: number;
    login: string;
    type?: string;
    card_no?: number;
    state?: string;
    checkin_at?: Date;
    checkout_at?: Date;
    log_id?: number;
    actor?: string;
    email?: string;
    access_token?: string;
    refresh_token?: string;
    profile?: any
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;
}

export type usersPk = "_id";
export type usersId = Users[usersPk];
export type usersOptionalAttributes =
    "_id"
    | "type"
    | "card_no"
    | "state"
    | "checkin_at"
    | "checkout_at"
    | "log_id"
    | "actor"
    | "email"
    | "access_token"
    | "refresh_token"
    | "profile"
    | "deleted_at"
    | "updated_at"
    | "created_at";
export type usersCreationAttributes = Optional<UsersAttributes, usersOptionalAttributes>;

export class Users extends Model<UsersAttributes, usersCreationAttributes> implements UsersAttributes {
    _id!: number;
    login!: string;
    type?: string;
    card_no?: number;
    state?: string;
    checkin_at?: Date;
    checkout_at?: Date;
    log_id?: number;
    actor?: string;
    email?: string;
    access_token?: string;
    refresh_token?: string;
    profile?: any
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;

    static initModel(sequelize: Sequelize.Sequelize): typeof Users {
        Users.init({
            _id: {
                autoIncrement: true,
                type: DataTypes.BIGINT,
                allowNull: false,
                primaryKey: true
            },
            login: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: "users_login_uindex"
            },
            type: {
                type: DataTypes.STRING(10),
                allowNull: true
            },
            card_no: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            state: {
                type: DataTypes.STRING(10),
                allowNull: true
            },
            checkin_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            checkout_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            actor: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            email: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            access_token: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            refresh_token: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            profile: {
                type: DataTypes.JSON,
                allowNull: true
            },
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: true
            }
        }, {
            sequelize,
            tableName: 'users',
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        {name: "_id"},
                    ]
                },
                {
                    name: "users_login_uindex",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        {name: "login"},
                    ]
                },
                {
                    name: "users__id_uindex",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        {name: "_id"},
                    ]
                },
            ]
        });
        return Users;
    }

    public static associations: {
        projects: Association<Users, History>;
    };

    get cardType() {
        return this.getClusterType(this.card_no);
    }

    async setState(state: CHECK_STATE, actor: string, cardId?: number, logId?: number) {
        logger.log('state: ', state, ', actor: ', actor, ', card_no: ', cardId, ', at: ', now().toDate().toISOString());

        const at = now().toDate();
        if (state === 'checkIn') {
            this.card_no = cardId
            this.checkin_at = at;
            this.actor = null;
        } else {
            this.actor = actor;
            this.card_no = null;
            this.checkout_at = at;
        }
        if (logId !== null && logId !== undefined) this.log_id = logId;
        this.state = state;
        this.updated_at = at;
        await this.save();
        return this;
    }

    getClusterType(id: number): CLUSTER_TYPE {
        const clusterType = id < 1000 ? CLUSTER_CODE[0] : CLUSTER_CODE[1];
        return clusterType as CLUSTER_TYPE;
    }
}