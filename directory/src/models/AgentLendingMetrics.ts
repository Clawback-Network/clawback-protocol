import { DataTypes, Model, type Sequelize } from "sequelize";

export interface AgentLendingMetricsAttributes {
  agent_address: string;
  loans_requested: number;
  loans_completed: number;
  loans_defaulted: number;
  total_borrowed: number;
  total_repaid: number;
  assessments_made: number;
  accuracy_score: number;
  total_staked: number;
  total_earned: number;
  total_lost: number;
  blacklisted: boolean;
}

export class AgentLendingMetrics extends Model<AgentLendingMetricsAttributes> {
  declare agent_address: string;
  declare loans_requested: number;
  declare loans_completed: number;
  declare loans_defaulted: number;
  declare total_borrowed: number;
  declare total_repaid: number;
  declare assessments_made: number;
  declare accuracy_score: number;
  declare total_staked: number;
  declare total_earned: number;
  declare total_lost: number;
  declare blacklisted: boolean;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

export function initAgentLendingMetricsModel(sequelize: Sequelize): void {
  AgentLendingMetrics.init(
    {
      agent_address: {
        type: DataTypes.STRING(42),
        primaryKey: true,
        allowNull: false,
      },
      loans_requested: {
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
      assessments_made: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      accuracy_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.5,
      },
      total_staked: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_earned: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_lost: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      blacklisted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      tableName: "clawback_agent_metrics",
      underscored: true,
    },
  );
}
