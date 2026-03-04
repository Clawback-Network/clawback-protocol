import { fn, col } from "sequelize";
import { Agent } from "./models/Agent.js";
import { Snapshot } from "./models/Snapshot.js";
import { CreditLineModel } from "./models/CreditLine.js";
import { CreditBacking } from "./models/CreditBacking.js";
import { config } from "./config.js";

/**
 * Compute current network stats and insert a snapshot row.
 */
export async function captureSnapshot(): Promise<void> {
  const totalAgents = await Agent.count();

  // Aggregate credit line stats
  const totalCreditLines = await CreditLineModel.count();
  const creditAgg = (await CreditLineModel.findOne({
    attributes: [
      [fn("COALESCE", fn("SUM", col("total_backing")), 0), "total_backing"],
      [fn("COALESCE", fn("SUM", col("total_drawn")), 0), "total_drawn"],
    ],
    raw: true,
  })) as unknown as { total_backing: number; total_drawn: number } | null;

  const activeCreditAssessors = await CreditBacking.count({
    where: { active: true },
    distinct: true,
    col: "assessor_addr",
  });

  await Snapshot.create({
    total_agents: totalAgents,
    total_credit_lines: totalCreditLines,
    total_credit_backing: Number(creditAgg?.total_backing ?? 0),
    total_credit_drawn: Number(creditAgg?.total_drawn ?? 0),
    active_credit_assessors: activeCreditAssessors,
    captured_at: new Date(),
  });

  console.log(
    `[snapshot] Captured: ${totalAgents} agents, ${totalCreditLines} credit lines`,
  );
}

/**
 * Start periodic snapshot capture.
 */
export function startSnapshotCapture(): NodeJS.Timeout {
  captureSnapshot().catch((err) =>
    console.error("[snapshot] Initial capture failed:", err),
  );
  return setInterval(() => {
    captureSnapshot().catch((err) =>
      console.error("[snapshot] Capture failed:", err),
    );
  }, config.snapshotIntervalMs);
}
