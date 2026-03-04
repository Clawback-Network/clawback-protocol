import { Router } from "express";
import { Op, fn, col } from "sequelize";
import { Agent } from "../models/Agent.js";
import { Snapshot } from "../models/Snapshot.js";
import { CreditLineModel } from "../models/CreditLine.js";
import { CreditBacking } from "../models/CreditBacking.js";
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

  // Credit line stats
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

  return {
    totalAgents,
    totalCreditLines,
    totalCreditBacking: Number(creditAgg?.total_backing ?? 0),
    totalCreditDrawn: Number(creditAgg?.total_drawn ?? 0),
    activeCreditAssessors,
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
      data = {
        totalAgents: snapshot.total_agents,
        totalCreditLines: snapshot.total_credit_lines,
        totalCreditBacking: snapshot.total_credit_backing,
        totalCreditDrawn: snapshot.total_credit_drawn,
        activeCreditAssessors: snapshot.active_credit_assessors,
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
      totalCreditLines: s.total_credit_lines,
      totalCreditBacking: s.total_credit_backing,
      totalCreditDrawn: s.total_credit_drawn,
      capturedAt: s.captured_at.toISOString(),
    }));

    res.json({ history, days });
  } catch (err) {
    next(err);
  }
});
