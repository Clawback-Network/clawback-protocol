import { DataTypes, Model, type Sequelize } from "sequelize";

export interface CreditBackingAttributes {
  borrower_addr: string;
  assessor_addr: string;
  max_amount: number;
  apr: number;
  drawn_amount: number;
  accrued_interest: number;
  earned_interest: number;
  active: boolean;
  block_number: number;
}

export class CreditBacking extends Model<CreditBackingAttributes> {
  declare borrower_addr: string;
  declare assessor_addr: string;
  declare max_amount: number;
  declare apr: number;
  declare drawn_amount: number;
  declare accrued_interest: number;
  declare earned_interest: number;
  declare active: boolean;
  declare block_number: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initCreditBackingModel(sequelize: Sequelize): void {
  CreditBacking.init(
    {
      borrower_addr: {
        type: DataTypes.STRING(42),
        primaryKey: true,
        allowNull: false,
      },
      assessor_addr: {
        type: DataTypes.STRING(42),
        primaryKey: true,
        allowNull: false,
      },
      max_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      apr: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      drawn_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      accrued_interest: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      earned_interest: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      block_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: "credit_backings",
      underscored: true,
    },
  );
}
