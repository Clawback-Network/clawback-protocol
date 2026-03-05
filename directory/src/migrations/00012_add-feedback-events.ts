import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.createTable("feedback_events", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    agent_token_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    agent_addr: {
      type: DataTypes.STRING(42),
      allowNull: true,
    },
    user_address: {
      type: DataTypes.STRING(42),
      allowNull: false,
    },
    feedback_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    value_decimals: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tag1: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    tag2: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    feedback_uri: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    feedback_hash: {
      type: DataTypes.STRING(66),
      allowNull: true,
    },
    block_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tx_hash: {
      type: DataTypes.STRING(66),
      allowNull: false,
    },
    event_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
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

  await qi.addIndex("feedback_events", ["agent_token_id"]);
  await qi.addIndex("feedback_events", ["agent_addr"]);
  await qi.addIndex("feedback_events", ["user_address"]);
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable("feedback_events");
}
