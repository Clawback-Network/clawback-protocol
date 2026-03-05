import { DataTypes, Model, type Sequelize } from "sequelize";

export interface FeedbackEventAttributes {
  id?: number;
  agent_token_id: string;
  agent_addr: string | null;
  user_address: string;
  feedback_index: number;
  value: number;
  value_decimals: number;
  tag1: string | null;
  tag2: string | null;
  feedback_uri: string | null;
  feedback_hash: string | null;
  block_number: number;
  tx_hash: string;
  event_timestamp: Date;
}

export class FeedbackEvent extends Model<FeedbackEventAttributes> {
  declare id: number;
  declare agent_token_id: string;
  declare agent_addr: string | null;
  declare user_address: string;
  declare feedback_index: number;
  declare value: number;
  declare value_decimals: number;
  declare tag1: string | null;
  declare tag2: string | null;
  declare feedback_uri: string | null;
  declare feedback_hash: string | null;
  declare block_number: number;
  declare tx_hash: string;
  declare event_timestamp: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initFeedbackEventModel(sequelize: Sequelize): void {
  FeedbackEvent.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      agent_token_id: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      agent_addr: {
        type: DataTypes.STRING(42),
        allowNull: true,
      },
      user_address: {
        type: DataTypes.STRING(42),
        allowNull: false,
      },
      feedback_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      value: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      value_decimals: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tag1: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      tag2: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      feedback_uri: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      feedback_hash: {
        type: DataTypes.STRING(66),
        allowNull: true,
      },
      block_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tx_hash: {
        type: DataTypes.STRING(66),
        allowNull: false,
      },
      event_timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "feedback_events",
      underscored: true,
      indexes: [
        { fields: ["agent_token_id"] },
        { fields: ["agent_addr"] },
        { fields: ["user_address"] },
      ],
    },
  );
}
