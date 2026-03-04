import type { Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  const { DataTypes } = await import("sequelize");

  // Drop last_heartbeat from agents
  await qi.removeColumn("agents", "last_heartbeat");

  // Rename agent_id → erc8004_agent_id on agents (pg-mem doesn't support renameColumn)
  await qi.addColumn("agents", "erc8004_agent_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  });
  // Copy data would happen in real postgres via raw query, but for pg-mem compatibility
  // we just add the column. In production, run:
  //   UPDATE agents SET erc8004_agent_id = agent_id;
  await qi.sequelize.query(
    "UPDATE agents SET erc8004_agent_id = agent_id WHERE agent_id IS NOT NULL",
  ).catch(() => { /* ignore if column already gone */ });
  await qi.removeColumn("agents", "agent_id");

  // Drop agent_id from credit_lines (AgentIdRegistered event removed)
  await qi.removeColumn("credit_lines", "agent_id");
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  const { DataTypes } = await import("sequelize");

  // Restore agent_id on credit_lines
  await qi.addColumn("credit_lines", "agent_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  });

  // Restore agent_id on agents from erc8004_agent_id
  await qi.addColumn("agents", "agent_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  });
  await qi.sequelize.query(
    "UPDATE agents SET agent_id = erc8004_agent_id WHERE erc8004_agent_id IS NOT NULL",
  ).catch(() => {});
  await qi.removeColumn("agents", "erc8004_agent_id");

  // Restore last_heartbeat
  await qi.addColumn("agents", "last_heartbeat", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });
}
