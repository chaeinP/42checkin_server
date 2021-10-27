import * as Sequelize from 'sequelize';
import {DataTypes, Model, Optional} from 'sequelize';

export interface ConfigAttributes {
    _id: number;
    env?: string;
    begin_at?: Date;
    end_at?: Date;
    open_at?: number;
    close_at?: number;
    checkin_at?: number;
    checkout_at?: number;
    seocho?: number;
    gaepo?: number;
    auth?: string;
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;
}

export type configPk = "_id";
export type configId = Config[configPk];
export type configOptionalAttributes = "_id" | "env" | "begin_at" | "end_at" | "seocho" | "gaepo";
export type configCreationAttributes = Optional<ConfigAttributes, configOptionalAttributes>;

export class Config extends Model<ConfigAttributes, configCreationAttributes> implements ConfigAttributes {
    _id: number;
    env?: string;
    begin_at?: Date;
    end_at?: Date;
    open_at?: number;
    close_at?: number;
    checkin_at?: number;
    checkout_at?: number;
    seocho?: number;
    gaepo?: number;
    auth?: string;
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;

    static initModel(sequelize: Sequelize.Sequelize): typeof Config {
        Config.init({
            _id: {
                autoIncrement: true,
                type: DataTypes.BIGINT,
                allowNull: false,
                primaryKey: true
            },
            env: {
                type: DataTypes.STRING(45),
            },
            auth: {
                type: DataTypes.STRING(10),
            },
            begin_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            end_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            open_at: {
                type: DataTypes.TIME,
                allowNull: true
            },
            close_at: {
                type: DataTypes.TIME,
                allowNull: true
            },
            checkin_at: {
                type: DataTypes.TIME,
                allowNull: true
            },
            checkout_at: {
                type: DataTypes.TIME,
                allowNull: true
            },
            seocho: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            gaepo: {
                type: DataTypes.INTEGER,
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
            },
        }, {
            sequelize,
            tableName: 'config',
            timestamps: false,
            indexes: [
                {
                    name: "config__id_uindex",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        { name: "_id" },
                    ]
                },
            ]
        });
        return Config;
    }
}
