import { Router } from "express";
import { Op, fn, col } from "sequelize";
import { Agent } from "../models/Agent.js";
import { Snapshot } from "../models/Snapshot.js";
import { readLimiter } from "../middleware/rateLimit.js";

export const statsRouter = Router();

let statsCache: { data: unknown; expiresAt: number } | null = null;
const STATS_CACHE_TTL_MS = 60_000; // 1 minute

/** Clear the stats cache (used in tests). */
export function clearStatsCache() {
  statsCache = null;
}

/**
 * Compute live stats (fallback when no snapshot exists).
 */
async function computeLiveStats() {
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

  // Count unique skills across all agents
  const allSkills = new Set<string>();
  for (const agent of agents) {
    if (Array.isArray(agent.skills)) {
      for (const skill of agent.skills) {
        allSkills.add(skill);
      }
    }
  }
  const uniqueSkills = allSkills.size;

  // Sum messages_sent across all agents
  const msgResult = (await Agent.findOne({
    attributes: [[fn("COALESCE", fn("SUM", col("messages_sent")), 0), "total"]],
    raw: true,
  })) as unknown as { total: number } | null;
  const totalMessages = Number(msgResult?.total ?? 0);

  return {
    totalAgents,
    topSkills,
    uniqueSkills,
    totalMessages,
  };
}

/**
 * GET /stats
 * Network-wide statistics — reads from latest snapshot, falls back to live.
 */
statsRouter.get("/", readLimiter, async (_req, res, next) => {
  try {
    const now = Date.now();
    if (statsCache && now < statsCache.expiresAt) {
      res.json(statsCache.data);
      return;
    }

    let data: unknown;

    const snapshot = await Snapshot.findOne({
      order: [["captured_at", "DESC"]],
    });

    if (snapshot) {
      // Compute live unique skills count
      const agents = await Agent.findAll({ attributes: ["skills"] });
      const allSkills = new Set<string>();
      for (const agent of agents) {
        if (Array.isArray(agent.skills)) {
          for (const skill of agent.skills) {
            allSkills.add(skill);
          }
        }
      }

      // Compute live total messages
      const msgResult = (await Agent.findOne({
        attributes: [
          [fn("COALESCE", fn("SUM", col("messages_sent")), 0), "total"],
        ],
        raw: true,
      })) as unknown as { total: number } | null;

      data = {
        totalAgents: snapshot.total_agents,
        topSkills: snapshot.top_skills,
        uniqueSkills: allSkills.size,
        totalMessages: Number(msgResult?.total ?? 0),
        totalLoans: snapshot.total_loans,
        loansCompleted: snapshot.loans_completed,
        loansDefaulted: snapshot.loans_defaulted,
        totalBorrowed: snapshot.total_borrowed,
        totalRepaid: snapshot.total_repaid,
        activeAssessors: snapshot.active_assessors,
        avgAccuracyScore: snapshot.avg_accuracy_score,
        totalStaked: snapshot.total_staked,
        capturedAt: snapshot.captured_at.toISOString(),
      };
    } else {
      data = await computeLiveStats();
    }

    statsCache = { data, expiresAt: now + STATS_CACHE_TTL_MS };
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /stats/history?days=30
 * Returns snapshot history downsampled to 1 per day.
 */
statsRouter.get("/history", readLimiter, async (req, res, next) => {
  try {
    const days = Math.min(
      Math.max(1, parseInt(req.query.days as string) || 30),
      90,
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const snapshots = await Snapshot.findAll({
      where: { captured_at: { [Op.gte]: since } },
      order: [["captured_at", "ASC"]],
    });

    // Downsample to 1 per day (take last snapshot of each day)
    const byDay = new Map<string, (typeof snapshots)[number]>();
    for (const snap of snapshots) {
      const day = snap.captured_at.toISOString().slice(0, 10);
      byDay.set(day, snap);
    }

    const history = [...byDay.values()].map((s) => ({
      totalAgents: s.total_agents,
      messagesReported: s.messages_reported,
      totalLoans: s.total_loans,
      loansCompleted: s.loans_completed,
      loansDefaulted: s.loans_defaulted,
      totalBorrowed: s.total_borrowed,
      totalRepaid: s.total_repaid,
      activeAssessors: s.active_assessors,
      avgAccuracyScore: s.avg_accuracy_score,
      totalStaked: s.total_staked,
      capturedAt: s.captured_at.toISOString(),
    }));

    res.json({ history, days });
  } catch (err) {
    next(err);
  }
});
