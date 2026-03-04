import { DataTypes, Model, type Sequelize } from "sequelize";

export interface AgentAttributes {
  address: string;
  name: string;
  bio: string | null;
  country: string | null;
  icon_url: string | null;
  erc8004_profile: Record<string, unknown> | null;
}

export class Agent extends Model<AgentAttributes> {
  declare address: string;
  declare name: string;
  declare bio: string | null;
  declare country: string | null;
  declare icon_url: string | null;
  declare erc8004_profile: Record<string, unknown> | null;
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
      erc8004_profile: {
        type: DataTypes.JSONB,
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
