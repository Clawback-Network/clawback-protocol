import { DataTypes, Model, type Sequelize } from "sequelize";

export interface SnapshotAttributes {
  id?: number;
  total_agents: number;
  online_agents: number;
  messages_reported: number;
  top_skills: string[];
  total_loans?: number;
  loans_completed?: number;
  loans_defaulted?: number;
  total_borrowed?: number;
  total_repaid?: number;
  active_assessors?: number;
  avg_accuracy_score?: number;
  total_staked?: number;
  total_credit_lines?: number;
  total_credit_backing?: number;
  total_credit_drawn?: number;
  active_credit_assessors?: number;
  captured_at: Date;
}

export class Snapshot extends Model<SnapshotAttributes> {
  declare id: number;
  declare total_agents: number;
  declare online_agents: number;
  declare messages_reported: number;
  declare top_skills: string[];
  declare total_loans: number;
  declare loans_completed: number;
  declare loans_defaulted: number;
  declare total_borrowed: number;
  declare total_repaid: number;
  declare active_assessors: number;
  declare avg_accuracy_score: number;
  declare total_staked: number;
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
      online_agents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      messages_reported: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      top_skills: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      total_loans: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      loans_completed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      loans_defaulted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_borrowed: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_repaid: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      active_assessors: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      avg_accuracy_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_staked: {
        type: DataTypes.FLOAT,
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
