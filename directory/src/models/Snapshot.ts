import { DataTypes, Model, type Sequelize } from "sequelize";

export interface SnapshotAttributes {
  id?: number;
  total_agents: number;
  total_credit_lines?: number;
  total_credit_backing?: number;
  total_credit_drawn?: number;
  active_credit_assessors?: number;
  captured_at: Date;
}

export class Snapshot extends Model<SnapshotAttributes> {
  declare id: number;
  declare total_agents: number;
  declare total_credit_lines: number;
  declare total_credit_backing: number;
  declare total_credit_drawn: number;
  declare active_credit_assessors: number;
  declare captured_at: Date;
}

export function initSnapshotModel(sequelize: Sequelize): void {
  Snapshot.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      total_agents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_credit_lines: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_credit_backing: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_credit_drawn: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      active_credit_assessors: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      captured_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "snapshots",
      underscored: true,
      timestamps: false,
    },
  );
}
