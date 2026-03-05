import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.addColumn("agents", "account_type", {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: "agent",
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn("agents", "account_type");
}
