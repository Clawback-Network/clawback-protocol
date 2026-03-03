import { DataTypes, Model, type Sequelize } from "sequelize";

export interface CreditLineAttributes {
  borrower_addr: string;
  total_backing: number;
  total_drawn: number;
  total_repaid: number;
  total_interest_paid: number;
  backer_count: number;
  status: string;
  last_repayment_at: Date | null;
  agent_id: number | null;
  block_number: number;
}

export class CreditLineModel extends Model<CreditLineAttributes> {
  declare borrower_addr: string;
  declare total_backing: number;
  declare total_drawn: number;
  declare total_repaid: number;
  declare total_interest_paid: number;
  declare backer_count: number;
  declare status: string;
  declare last_repayment_at: Date | null;
  declare agent_id: number | null;
  declare block_number: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initCreditLineModel(sequelize: Sequelize): void {
  CreditLineModel.init(
    {
      borrower_addr: {
        type: DataTypes.STRING(42),
        primaryKey: true,
        allowNull: false,
      },
      total_backing: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_drawn: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_repaid: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_interest_paid: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      backer_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "active",
      },
      last_repayment_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      agent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      block_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: "credit_lines",
      underscored: true,
    },
  );
}
