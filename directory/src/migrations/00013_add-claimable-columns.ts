import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.addColumn("credit_backings", "claimable_interest", {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn("credit_backings", "claimable_capital", {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn("credit_backings", "claimable_interest");
  await qi.removeColumn("credit_backings", "claimable_capital");
}
