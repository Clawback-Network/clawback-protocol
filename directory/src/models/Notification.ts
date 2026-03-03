import { DataTypes, Model, type Sequelize } from "sequelize";

export interface NotificationAttributes {
  id?: string;
  type: string;
  loan_id: string;
  agent_addr: string;
  data: Record<string, unknown>;
  createdAt?: Date;
}

export class Notification extends Model<NotificationAttributes> {
  declare id: string;
  declare type: string;
  declare loan_id: string;
  declare agent_addr: string;
  declare data: Record<string, unknown>;
  declare readonly createdAt: Date;
}

export function initNotificationModel(sequelize: Sequelize): void {
  Notification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      loan_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      agent_addr: {
        type: DataTypes.STRING(42),
        allowNull: false,
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      sequelize,
      tableName: "clawback_notifications",
      underscored: true,
      updatedAt: false,
    },
  );
}
