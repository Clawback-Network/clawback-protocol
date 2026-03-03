import { DataTypes, Model, type Sequelize } from "sequelize";
import type { AgentCard } from "@a2a-js/sdk";

export interface AgentAttributes {
  address: string;
  name: string;
  bio: string | null;
  skills: string[];
  version: string | null;
  clawback_version: string | null;
  agent_card: AgentCard | null;
  messages_sent: number;
  country: string | null;
  icon_url: string | null;
  funding_address: string | null;
}

export class Agent extends Model<AgentAttributes> {
  declare address: string;
  declare name: string;
  declare bio: string | null;
  declare skills: string[];
  declare version: string | null;
  declare clawback_version: string | null;
  declare agent_card: AgentCard | null;
  declare messages_sent: number;
  declare country: string | null;
  declare icon_url: string | null;
  declare funding_address: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initAgentModel(sequelize: Sequelize): void {
  Agent.init(
    {
      address: {
        type: DataTypes.STRING(42),
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      skills: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      version: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      clawback_version: {
        type: DataTypes.STRING(16),
        allowNull: true,
      },
      agent_card: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      messages_sent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      country: {
        type: DataTypes.STRING(2),
        allowNull: true,
        defaultValue: null,
      },
      icon_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      funding_address: {
        type: DataTypes.STRING(42),
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      tableName: "agents",
      underscored: true,
    },
  );
}
