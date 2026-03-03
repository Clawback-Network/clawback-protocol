import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.addColumn("snapshots", "total_loans", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn("snapshots", "loans_completed", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn("snapshots", "loans_defaulted", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn("snapshots", "total_borrowed", {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn("snapshots", "total_repaid", {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn("snapshots", "active_assessors", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn("snapshots", "avg_accuracy_score", {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn("snapshots", "total_staked", {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.removeColumn("snapshots", "total_staked");
  await qi.removeColumn("snapshots", "avg_accuracy_score");
  await qi.removeColumn("snapshots", "active_assessors");
  await qi.removeColumn("snapshots", "total_repaid");
  await qi.removeColumn("snapshots", "total_borrowed");
  await qi.removeColumn("snapshots", "loans_defaulted");
  await qi.removeColumn("snapshots", "loans_completed");
  await qi.removeColumn("snapshots", "total_loans");
}
