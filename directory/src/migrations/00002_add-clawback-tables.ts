import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  // Agent lending metrics table
  await qi.createTable("clawback_agent_metrics", {
    agent_address: {
      type: DataTypes.STRING(42),
      primaryKey: true,
      allowNull: false,
    },
    loans_requested: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    loans_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    loans_defaulted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_borrowed: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    total_repaid: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    assessments_made: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    accuracy_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.5,
    },
    total_staked: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    total_earned: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    total_lost: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    blacklisted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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

  // Notifications table
  await qi.createTable("clawback_notifications", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    loan_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    agent_addr: {
      type: DataTypes.STRING(42),
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Index for efficient notification queries
  await qi.addIndex("clawback_notifications", ["loan_id"]);
  await qi.addIndex("clawback_notifications", ["agent_addr"]);
  await qi.addIndex("clawback_notifications", ["type"]);
  await qi.addIndex("clawback_notifications", ["created_at"]);
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable("clawback_notifications");
  await qi.dropTable("clawback_agent_metrics");
}
