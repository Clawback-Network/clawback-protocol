import { Op, fn, col } from "sequelize";
// Op is still needed for assessments_made filter
import { Agent } from "./models/Agent.js";
import { AgentLendingMetrics } from "./models/AgentLendingMetrics.js";
import { Snapshot } from "./models/Snapshot.js";
import { CreditLineModel } from "./models/CreditLine.js";
import { CreditBacking } from "./models/CreditBacking.js";
import { config } from "./config.js";

/**
 * Compute current network stats and insert a snapshot row.
 */
export async function captureSnapshot(): Promise<void> {
  const totalAgents = await Agent.count();

  const agents = await Agent.findAll({
    attributes: ["skills"],
  });

  const skillCounts = new Map<string, number>();
  for (const agent of agents) {
    if (Array.isArray(agent.skills)) {
      for (const skill of agent.skills) {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      }
    }
  }

  const topSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill);

  // Sum messages_sent across all agents
  const msgResult = (await Agent.findOne({
    attributes: [[fn("COALESCE", fn("SUM", col("messages_sent")), 0), "total"]],
    raw: true,
  })) as unknown as { total: number } | null;
  const messagesReported = Number(msgResult?.total ?? 0);

  // Aggregate lending metrics
  const lendingAgg = (await AgentLendingMetrics.findOne({
    attributes: [
      [fn("COALESCE", fn("SUM", col("loans_requested")), 0), "total_loans"],
      [fn("COALESCE", fn("SUM", col("loans_completed")), 0), "loans_completed"],
      [fn("COALESCE", fn("SUM", col("loans_defaulted")), 0), "loans_defaulted"],
      [fn("COALESCE", fn("SUM", col("total_borrowed")), 0), "total_borrowed"],
      [fn("COALESCE", fn("SUM", col("total_repaid")), 0), "total_repaid"],
      [fn("COALESCE", fn("SUM", col("total_staked")), 0), "total_staked"],
    ],
    raw: true,
  })) as unknown as {
    total_loans: number;
    loans_completed: number;
    loans_defaulted: number;
    total_borrowed: number;
    total_repaid: number;
    total_staked: number;
  } | null;

  // Count assessors (agents with assessments_made > 0) and their avg accuracy
  const activeAssessors = await AgentLendingMetrics.count({
    where: { assessments_made: { [Op.gt]: 0 } },
  });

  const accuracyResult = (await AgentLendingMetrics.findOne({
    attributes: [
      [fn("COALESCE", fn("AVG", col("accuracy_score")), 0), "avg_accuracy"],
    ],
    where: { assessments_made: { [Op.gt]: 0 } },
    raw: true,
  })) as unknown as { avg_accuracy: number } | null;

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
    online_agents: 0,
    messages_reported: messagesReported,
    top_skills: topSkills,
    total_loans: Number(lendingAgg?.total_loans ?? 0),
    loans_completed: Number(lendingAgg?.loans_completed ?? 0),
    loans_defaulted: Number(lendingAgg?.loans_defaulted ?? 0),
    total_borrowed: Number(lendingAgg?.total_borrowed ?? 0),
    total_repaid: Number(lendingAgg?.total_repaid ?? 0),
    active_assessors: activeAssessors,
    avg_accuracy_score: Number(accuracyResult?.avg_accuracy ?? 0),
    total_staked: Number(lendingAgg?.total_staked ?? 0),
    total_credit_lines: totalCreditLines,
    total_credit_backing: Number(creditAgg?.total_backing ?? 0),
    total_credit_drawn: Number(creditAgg?.total_drawn ?? 0),
    active_credit_assessors: activeCreditAssessors,
    captured_at: new Date(),
  });

  console.log(
    `[snapshot] Captured: ${totalAgents} agents, ${topSkills.length} skills, ${Number(lendingAgg?.total_loans ?? 0)} loans, ${totalCreditLines} credit lines`,
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
