import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  // Indexer state (singleton cursor)
  await qi.createTable("indexer_state", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      defaultValue: 1,
    },
    last_block_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable("indexer_state");
}
