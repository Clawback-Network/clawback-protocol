import type { Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  // Drop unused columns from agents table
  await qi.removeColumn("agents", "skills");
  await qi.removeColumn("agents", "messages_sent");
  await qi.removeColumn("agents", "availability");

  // Drop unused columns from snapshots table
  await qi.removeColumn("snapshots", "messages_reported");
  await qi.removeColumn("snapshots", "online_agents");
  await qi.removeColumn("snapshots", "top_skills");
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  const { DataTypes } = await import("sequelize");

  await qi.addColumn("agents", "skills", {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  });
  await qi.addColumn("agents", "messages_sent", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
  await qi.addColumn("agents", "availability", {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: "online",
  });
  await qi.addColumn("snapshots", "messages_reported", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
  await qi.addColumn("snapshots", "online_agents", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
  await qi.addColumn("snapshots", "top_skills", {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  });
}
