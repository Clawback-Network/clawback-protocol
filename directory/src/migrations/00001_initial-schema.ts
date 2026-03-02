import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  // Agents table (consolidated initial schema)
  await qi.createTable("agents", {
    address: {
      type: DataTypes.STRING(42),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    skills: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    availability: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "online",
    },
    version: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    clawback_version: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    last_heartbeat: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    agent_card: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    messages_sent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    country: {
      type: DataTypes.STRING(2),
      allowNull: true,
      defaultValue: null,
    },
    icon_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    funding_address: {
      type: DataTypes.STRING(42),
      allowNull: true,
      defaultValue: null,
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

  // Snapshots table
  await qi.createTable("snapshots", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    total_agents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    online_agents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    messages_reported: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    top_skills: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    captured_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable("snapshots");
  await qi.dropTable("agents");
}
