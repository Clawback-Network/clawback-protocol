import type { Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  const { DataTypes } = await import("sequelize");

  // Drop the old integer column
  await qi.removeColumn("agents", "erc8004_agent_id");

  // Add JSONB profile column
  await qi.addColumn("agents", "erc8004_profile", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  const { DataTypes } = await import("sequelize");

  // Remove JSONB profile column
  await qi.removeColumn("agents", "erc8004_profile");

  // Restore the old integer column
  await qi.addColumn("agents", "erc8004_agent_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  });
}
