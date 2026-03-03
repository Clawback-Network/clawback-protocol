import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  // Loans table
  await qi.createTable("clawback_loans", {
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await qi.addIndex("clawback_loans", ["borrower_addr"]);
  await qi.addIndex("clawback_loans", ["status"]);

  // Loan assessments table
  await qi.createTable("clawback_loan_assessments", {
    loan_id: {
      type: DataTypes.STRING(66),
      allowNull: false,
    },
    assessor_addr: {
      type: DataTypes.STRING(42),
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Composite primary key
  await qi.addConstraint("clawback_loan_assessments", {
    fields: ["loan_id", "assessor_addr"],
    type: "primary key",
    name: "clawback_loan_assessments_pkey",
  });

  await qi.addIndex("clawback_loan_assessments", ["loan_id"]);
  await qi.addIndex("clawback_loan_assessments", ["assessor_addr"]);

  // Indexer state (singleton cursor)
  await qi.createTable("indexer_state", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      defaultValue: 1,
    },
    last_block_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable("indexer_state");
  await qi.dropTable("clawback_loan_assessments");
  await qi.dropTable("clawback_loans");
}
