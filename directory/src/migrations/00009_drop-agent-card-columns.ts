import type { Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.removeColumn("agents", "version");
  await qi.removeColumn("agents", "clawback_version");
  await qi.removeColumn("agents", "agent_card");
  await qi.removeColumn("agents", "funding_address");
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  const { DataTypes } = await import("sequelize");

  await qi.addColumn("agents", "version", {
    type: DataTypes.STRING(64),
    allowNull: true,
  });
  await qi.addColumn("agents", "clawback_version", {
    type: DataTypes.STRING(16),
    allowNull: true,
  });
  await qi.addColumn("agents", "agent_card", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  });
  await qi.addColumn("agents", "funding_address", {
    type: DataTypes.STRING(42),
    allowNull: true,
    defaultValue: null,
  });
}
