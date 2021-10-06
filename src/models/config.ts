import * as Sequelize from 'sequelize';
import {DataTypes, Model, Optional} from 'sequelize';

export interface ConfigAttributes {
    _id: number;
    env?: string;
    begin_at?: Date;
    end_at?: Date;
    seocho?: number;
    gaepo?: number;
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
    seocho?: number;
    gaepo?: number;


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
                unique: "env_UNIQUE"
            },
            begin_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            end_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            seocho: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            gaepo: {
                type: DataTypes.INTEGER,
                allowNull: true
            }
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
