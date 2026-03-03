import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  // Credit lines table
  await qi.createTable("credit_lines", {
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Credit backings table
  await qi.createTable("credit_backings", {
    borrower_addr: {
      type: DataTypes.STRING(42),
      allowNull: false,
    },
    assessor_addr: {
      type: DataTypes.STRING(42),
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Composite primary key
  await qi.addConstraint("credit_backings", {
    fields: ["borrower_addr", "assessor_addr"],
    type: "primary key",
    name: "credit_backings_pkey",
  });

  await qi.addIndex("credit_backings", ["assessor_addr"]);

  // Add credit line snapshot columns
  await qi.addColumn("snapshots", "total_credit_lines", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
  await qi.addColumn("snapshots", "total_credit_backing", {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  });
  await qi.addColumn("snapshots", "total_credit_drawn", {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  });
  await qi.addColumn("snapshots", "active_credit_assessors", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn("snapshots", "total_credit_lines");
  await qi.removeColumn("snapshots", "total_credit_backing");
  await qi.removeColumn("snapshots", "total_credit_drawn");
  await qi.removeColumn("snapshots", "active_credit_assessors");
  await qi.dropTable("credit_backings");
  await qi.dropTable("credit_lines");
}
