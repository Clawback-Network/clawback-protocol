import { DataTypes, Model, type Sequelize } from "sequelize";

export interface LoanAttributes {
  loan_id: string;
  borrower_addr: string;
  amount_requested: number;
  min_funding_amount: number;
  total_funded: number;
  total_repaid: number;
  collateral_amount: number;
  funding_deadline: Date;
  activated_at: Date | null;
  duration_days: number;
  status: string;
  block_number: number;
}

export class Loan extends Model<LoanAttributes> {
  declare loan_id: string;
  declare borrower_addr: string;
  declare amount_requested: number;
  declare min_funding_amount: number;
  declare total_funded: number;
  declare total_repaid: number;
  declare collateral_amount: number;
  declare funding_deadline: Date;
  declare activated_at: Date | null;
  declare duration_days: number;
  declare status: string;
  declare block_number: number;
  declare readonly createdAt: Date;
}

export function initLoanModel(sequelize: Sequelize): void {
  Loan.init(
    {
      loan_id: {
        type: DataTypes.STRING(66),
        primaryKey: true,
        allowNull: false,
      },
      borrower_addr: {
        type: DataTypes.STRING(42),
        allowNull: false,
      },
      amount_requested: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      min_funding_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      total_funded: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_repaid: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      collateral_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      funding_deadline: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      activated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      duration_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "funding",
      },
      block_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "clawback_loans",
      underscored: true,
      updatedAt: false,
    },
  );
}
