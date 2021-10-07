import Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface UsageAttributes {
    _id: number;
    login?: string;
    checkin_at?: Date;
    checkout_at?: Date;
    duration?: number;
    actor?: string;
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;
}

export type usagePk = "_id";
export type usageId = Usages[usagePk];
export type usageOptionalAttributes =
    "_id"
    | "login"
    | "checkin_at"
    | "checkout_at"
    | "duration"
    | "actor"
    | "deleted_at"
    | "updated_at"
    | "created_at";
export type usageCreationAttributes = Optional<UsageAttributes, usageOptionalAttributes>;

export class Usages extends Model<UsageAttributes, usageCreationAttributes> implements UsageAttributes {
    _id!: number;
    login?: string;
    actor?: string;
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;

    static initModel(sequelize: Sequelize.Sequelize): typeof Usages {
        Usages.init({
            _id: {
                autoIncrement: true,
                type: DataTypes.BIGINT,
                allowNull: false,
                primaryKey: true
            },
            login: {
                type: DataTypes.STRING(50),
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
            duration: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            actor: {
                type: DataTypes.STRING(50),
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
            tableName: 'usages',
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
                    name: "usage__id_uindex",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        {name: "_id"},
                    ]
                },
            ]
        });
        return Usages;
    }
}
