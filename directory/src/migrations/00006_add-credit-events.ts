import { DataTypes, type Sequelize } from "sequelize";

export async function up({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();

  await qi.createTable("credit_events", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    event_type: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    borrower_addr: {
      type: DataTypes.STRING(42),
      allowNull: false,
    },
    assessor_addr: {
      type: DataTypes.STRING(42),
      allowNull: true,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    apr: {
      type: DataTypes.FLOAT,
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

  await qi.addIndex("credit_events", ["borrower_addr"]);
  await qi.addIndex("credit_events", ["assessor_addr"]);
  await qi.addIndex("credit_events", ["event_type"]);
  await qi.addIndex("credit_events", ["event_timestamp"]);
}

export async function down({ context: sequelize }: { context: Sequelize }) {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable("credit_events");
}
