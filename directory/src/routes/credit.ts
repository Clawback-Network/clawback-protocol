import { Router } from "express";
import { Op, fn, col } from "sequelize";
import { CreditLineModel } from "../models/CreditLine.js";
import { CreditBacking } from "../models/CreditBacking.js";
import { CreditEvent } from "../models/CreditEvent.js";
import { readLimiter } from "../middleware/rateLimit.js";

export const creditRouter = Router();

/**
 * GET /credit/lines
 * List credit lines with optional filters: ?status=, ?min_backing=, ?limit=, ?offset=
 */
creditRouter.get("/lines", readLimiter, async (req, res, next) => {
  try {
    const {
      status,
      min_backing,
      limit: limitStr,
      offset: offsetStr,
    } = req.query;
    const limit = Math.min(
      Math.max(1, parseInt(limitStr as string) || 50),
      200,
    );
    const offset = Math.max(0, parseInt(offsetStr as string) || 0);

    const where: Record<string, unknown> = {};

    if (status && typeof status === "string") {
      where.status = status;
    }

    if (min_backing && typeof min_backing === "string") {
      const minVal = parseFloat(min_backing);
      if (!isNaN(minVal)) {
        where.total_backing = { [Op.gte]: minVal };
      }
    }

    const { rows, count } = await CreditLineModel.findAndCountAll({
      where,
      order: [["total_backing", "DESC"]],
      limit,
      offset,
    });

    res.json({
      credit_lines: rows,
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /credit/lines/:address
 * Single credit line detail with all backings.
 */
creditRouter.get("/lines/:address", readLimiter, async (req, res, next) => {
  try {
    const addr = (req.params.address as string).toLowerCase();
    const creditLine = await CreditLineModel.findByPk(addr);

    if (!creditLine) {
      res.status(404).json({ error: "Credit line not found" });
      return;
    }

    const backings = await CreditBacking.findAll({
      where: { borrower_addr: addr },
      order: [["max_amount", "DESC"]],
    });

    // Compute blended APR
    let blendedApr = 0;
    if (creditLine.total_backing > 0) {
      let weightedSum = 0;
      for (const b of backings) {
        weightedSum += b.max_amount * b.apr;
      }
      blendedApr = weightedSum / creditLine.total_backing;
    }

    res.json({
      ...creditLine.toJSON(),
      blended_apr: blendedApr,
      backings: backings.map((b) => b.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /credit/backers/:address
 * All agents this assessor is backing.
 */
creditRouter.get("/backers/:address", readLimiter, async (req, res, next) => {
  try {
    const addr = (req.params.address as string).toLowerCase();

    const backings = await CreditBacking.findAll({
      where: { assessor_addr: addr, active: true },
      order: [["max_amount", "DESC"]],
    });

    res.json({
      assessor: addr,
      backings: backings.map((b) => b.toJSON()),
      total_backed: backings.reduce((sum, b) => sum + b.max_amount, 0),
      total_exposure: backings.reduce((sum, b) => sum + b.drawn_amount, 0),
      agents_backed: backings.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /credit/assessors/:address
 * All assessors backing this borrower.
 */
creditRouter.get("/assessors/:address", readLimiter, async (req, res, next) => {
  try {
    const addr = (req.params.address as string).toLowerCase();

    const backings = await CreditBacking.findAll({
      where: { borrower_addr: addr, active: true },
      order: [["max_amount", "DESC"]],
    });

    res.json({
      borrower: addr,
      assessors: backings.map((b) => b.toJSON()),
      total_backing: backings.reduce((sum, b) => sum + b.max_amount, 0),
      backer_count: backings.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /credit/leaderboard
 * Top assessors by earned interest.
 */
creditRouter.get("/leaderboard", readLimiter, async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit as string) || 20),
      100,
    );

    const results = (await CreditBacking.findAll({
      attributes: [
        "assessor_addr",
        [fn("SUM", col("max_amount")), "total_backed"],
        [fn("SUM", col("drawn_amount")), "total_exposure"],
        [fn("SUM", col("earned_interest")), "total_earned"],
        [fn("COUNT", col("borrower_addr")), "agents_backed"],
      ],
      where: { active: true },
      group: ["assessor_addr"],
      order: [[fn("SUM", col("earned_interest")), "DESC"]],
      limit,
      raw: true,
    })) as unknown as Array<{
      assessor_addr: string;
      total_backed: number;
      total_exposure: number;
      total_earned: number;
      agents_backed: number;
    }>;

    res.json({
      leaderboard: results.map((r) => ({
        address: r.assessor_addr,
        total_backed: Number(r.total_backed),
        total_exposure: Number(r.total_exposure),
        total_earned: Number(r.total_earned),
        agents_backed: Number(r.agents_backed),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /credit/events
 * Recent credit events. Filter by ?address=, ?event_type=, ?limit=, ?offset=
 * address matches either borrower_addr or assessor_addr.
 */
creditRouter.get("/events", readLimiter, async (req, res, next) => {
  try {
    const {
      address,
      event_type,
      limit: limitStr,
      offset: offsetStr,
    } = req.query;
    const limit = Math.min(
      Math.max(1, parseInt(limitStr as string) || 50),
      200,
    );
    const offset = Math.max(0, parseInt(offsetStr as string) || 0);

    const where: Record<string, unknown> = {};

    if (address && typeof address === "string") {
      const addr = address.toLowerCase();
      where[Op.or as unknown as string] = [
        { borrower_addr: addr },
        { assessor_addr: addr },
      ];
    }

    if (event_type && typeof event_type === "string") {
      where.event_type = event_type;
    }

    if (req.query.since && typeof req.query.since === "string") {
      const sinceDate = new Date(req.query.since);
      if (!isNaN(sinceDate.getTime())) {
        where.event_timestamp = { [Op.gt]: sinceDate };
      }
    }

    const { rows, count } = await CreditEvent.findAndCountAll({
      where,
      order: [["event_timestamp", "DESC"]],
      limit,
      offset,
    });

    res.json({
      events: rows,
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /credit/events/:address
 * Credit events for a specific address (as borrower or assessor).
 * Optional: ?since= (ISO 8601) to only return events after a given timestamp.
 */
creditRouter.get("/events/:address", readLimiter, async (req, res, next) => {
  try {
    const addr = (req.params.address as string).toLowerCase();
    const { event_type, limit: limitStr, offset: offsetStr } = req.query;
    const limit = Math.min(
      Math.max(1, parseInt(limitStr as string) || 50),
      200,
    );
    const offset = Math.max(0, parseInt(offsetStr as string) || 0);

    const where: Record<string, unknown> = {
      [Op.or as unknown as string]: [
        { borrower_addr: addr },
        { assessor_addr: addr },
      ],
    };

    if (event_type && typeof event_type === "string") {
      where.event_type = event_type;
    }

    if (req.query.since && typeof req.query.since === "string") {
      const sinceDate = new Date(req.query.since);
      if (!isNaN(sinceDate.getTime())) {
        where.event_timestamp = { [Op.gt]: sinceDate };
      }
    }

    const { rows, count } = await CreditEvent.findAndCountAll({
      where,
      order: [["event_timestamp", "DESC"]],
      limit,
      offset,
    });

    res.json({
      events: rows,
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});
