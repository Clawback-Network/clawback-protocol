import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.changeColumn("feedback_events", "agent_token_id", {
    type: DataTypes.STRING(32),
    allowNull: true,
  });

  await qi.changeColumn("feedback_events", "block_number", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await qi.changeColumn("feedback_events", "tx_hash", {
    type: DataTypes.STRING(66),
    allowNull: true,
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.changeColumn("feedback_events", "agent_token_id", {
    type: DataTypes.STRING(32),
    allowNull: false,
  });

  await qi.changeColumn("feedback_events", "block_number", {
    type: DataTypes.INTEGER,
    allowNull: false,
  });

  await qi.changeColumn("feedback_events", "tx_hash", {
    type: DataTypes.STRING(66),
    allowNull: false,
  });
}
