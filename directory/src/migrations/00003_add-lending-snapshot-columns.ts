import type { Sequelize } from "sequelize";

export async function up(_ctx: { context: Sequelize }) {
  // No-op: lending snapshot columns removed
}

export async function down(_ctx: { context: Sequelize }) {
  // No-op: lending snapshot columns removed
}
