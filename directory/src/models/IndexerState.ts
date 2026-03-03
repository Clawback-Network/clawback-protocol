import { DataTypes, Model, type Sequelize } from "sequelize";

export interface IndexerStateAttributes {
  id: number;
  last_block_number: number;
}

export class IndexerState extends Model<IndexerStateAttributes> {
  declare id: number;
  declare last_block_number: number;
  declare readonly updatedAt: Date;
}

export function initIndexerStateModel(sequelize: Sequelize): void {
  IndexerState.init(
    {
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
    },
    {
      sequelize,
      tableName: "indexer_state",
      underscored: true,
      createdAt: false,
    },
  );
}
