import { DataTypes, Model, type Sequelize } from "sequelize";

export interface CreditEventAttributes {
  id?: number;
  event_type: string;
  borrower_addr: string;
  assessor_addr: string | null;
  amount: number | null;
  apr: number | null;
  block_number: number;
  tx_hash: string;
  event_timestamp: Date;
}

export class CreditEvent extends Model<CreditEventAttributes> {
  declare id: number;
  declare event_type: string;
  declare borrower_addr: string;
  declare assessor_addr: string | null;
  declare amount: number | null;
  declare apr: number | null;
  declare block_number: number;
  declare tx_hash: string;
  declare event_timestamp: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initCreditEventModel(sequelize: Sequelize): void {
  CreditEvent.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      event_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      borrower_addr: {
        type: DataTypes.STRING(42),
        allowNull: false,
      },
      assessor_addr: {
        type: DataTypes.STRING(42),
        allowNull: true,
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      apr: {
        type: DataTypes.FLOAT,
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
      tableName: "credit_events",
      underscored: true,
      indexes: [
        { fields: ["borrower_addr"] },
        { fields: ["assessor_addr"] },
        { fields: ["event_type"] },
        { fields: ["event_timestamp"] },
      ],
    },
  );
}
