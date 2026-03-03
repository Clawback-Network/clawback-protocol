import { DataTypes, Model, type Sequelize } from "sequelize";

export interface LoanAssessmentAttributes {
  loan_id: string;
  assessor_addr: string;
  stake_amount: number;
  apr: number;
  block_number: number;
  withdrawn_at: Date | null;
}

export class LoanAssessment extends Model<LoanAssessmentAttributes> {
  declare loan_id: string;
  declare assessor_addr: string;
  declare stake_amount: number;
  declare apr: number;
  declare block_number: number;
  declare withdrawn_at: Date | null;
  declare readonly createdAt: Date;
}

export function initLoanAssessmentModel(sequelize: Sequelize): void {
  LoanAssessment.init(
    {
      loan_id: {
        type: DataTypes.STRING(66),
        primaryKey: true,
        allowNull: false,
      },
      assessor_addr: {
        type: DataTypes.STRING(42),
        primaryKey: true,
        allowNull: false,
      },
      stake_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      apr: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      block_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      withdrawn_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      tableName: "clawback_loan_assessments",
      underscored: true,
      updatedAt: false,
    },
  );
}
