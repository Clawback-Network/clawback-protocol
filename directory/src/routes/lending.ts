import { Router } from "express";
import { Op } from "sequelize";
import { AgentLendingMetrics } from "../models/AgentLendingMetrics.js";
import { Notification } from "../models/Notification.js";
import { Loan } from "../models/Loan.js";
import { LoanAssessment } from "../models/LoanAssessment.js";
import { readLimiter } from "../middleware/rateLimit.js";

export const lendingRouter = Router();

// ─── Loan Endpoints ─────────────────────────────────────────────

/**
 * GET /lending/loans
 * List loans with optional filters: ?status=, ?borrower=, ?limit=, ?offset=
 */
lendingRouter.get("/loans", readLimiter, async (req, res, next) => {
  try {
    const { status, borrower, limit: limitStr, offset: offsetStr } = req.query;
    const limit = Math.min(
      Math.max(1, parseInt(limitStr as string) || 50),
      200,
    );
    const offset = Math.max(0, parseInt(offsetStr as string) || 0);

    const where: Record<string, unknown> = {};

    if (status && typeof status === "string") {
      where.status = status;
    }

    if (borrower && typeof borrower === "string") {
      where.borrower_addr = borrower.toLowerCase();
    }

    const { rows, count } = await Loan.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    res.json({
      loans: rows,
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /lending/loans/:id
 * Single loan detail with joined assessments.
 */
lendingRouter.get("/loans/:id", readLimiter, async (req, res, next) => {
  try {
    const loanId = req.params.id as string;
    const loan = await Loan.findByPk(loanId);

    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const assessments = await LoanAssessment.findAll({
      where: { loan_id: loanId },
      order: [["created_at", "ASC"]],
    });

    res.json({
      ...loan.toJSON(),
      assessments: assessments.map((a) => a.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Agent Metrics Endpoints ────────────────────────────────────

/**
 * GET /lending/agents/:address
 * Get lending metrics for an agent.
 */
lendingRouter.get("/agents/:address", readLimiter, async (req, res, next) => {
  try {
    const addr = (req.params.address as string).toLowerCase();
    const metrics = await AgentLendingMetrics.findByPk(addr);

    if (!metrics) {
      // Return empty metrics for agents with no lending history
      res.json({
        agent_address: addr,
        loans_requested: 0,
        loans_completed: 0,
        loans_defaulted: 0,
        total_borrowed: 0,
        total_repaid: 0,
        assessments_made: 0,
        accuracy_score: 0.5,
        total_staked: 0,
        total_earned: 0,
        total_lost: 0,
        blacklisted: false,
      });
      return;
    }

    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /lending/agents/:address
 * @deprecated Use the on-chain indexer instead. Kept for dev/backward compat.
 */
lendingRouter.post("/agents/:address", async (req, res, next) => {
  try {
    res.setHeader("Deprecation", "true");
    res.setHeader(
      "Sunset",
      "Use the on-chain indexer — metrics are now populated automatically from contract events.",
    );

    const addr = (req.params.address as string).toLowerCase();
    const updates = req.body as Record<string, unknown>;

    const [metrics] = await AgentLendingMetrics.upsert({
      agent_address: addr,
      loans_requested: (updates.loans_requested as number) ?? 0,
      loans_completed: (updates.loans_completed as number) ?? 0,
      loans_defaulted: (updates.loans_defaulted as number) ?? 0,
      total_borrowed: (updates.total_borrowed as number) ?? 0,
      total_repaid: (updates.total_repaid as number) ?? 0,
      assessments_made: (updates.assessments_made as number) ?? 0,
      accuracy_score: (updates.accuracy_score as number) ?? 0.5,
      total_staked: (updates.total_staked as number) ?? 0,
      total_earned: (updates.total_earned as number) ?? 0,
      total_lost: (updates.total_lost as number) ?? 0,
      blacklisted: (updates.blacklisted as boolean) ?? false,
    });

    res.json({ success: true, metrics });
  } catch (err) {
    next(err);
  }
});

// ─── Notification Endpoints ─────────────────────────────────────

/**
 * GET /lending/notifications
 * Filterable notifications feed.
 */
lendingRouter.get("/notifications", readLimiter, async (req, res, next) => {
  try {
    const { since, types, limit: limitStr } = req.query;
    const limit = Math.min(
      Math.max(1, parseInt(limitStr as string) || 50),
      200,
    );
    const where: Record<string, unknown> = {};

    if (since && typeof since === "string") {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.created_at = { [Op.gte]: sinceDate };
      }
    }

    if (types && typeof types === "string") {
      const typeList = types.split(",").map((t) => t.trim());
      where.type = { [Op.in]: typeList };
    }

    const notifications = await Notification.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
    });

    res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        loan_id: n.loan_id,
        agent_addr: n.agent_addr,
        data: n.data,
        timestamp: n.createdAt?.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /lending/notifications
 * @deprecated Use the on-chain indexer instead. Kept for dev/backward compat.
 */
lendingRouter.post("/notifications", async (req, res, next) => {
  try {
    res.setHeader("Deprecation", "true");
    res.setHeader(
      "Sunset",
      "Use the on-chain indexer — notifications are now created automatically from contract events.",
    );

    const { type, loan_id, agent_addr, data } = req.body as {
      type: string;
      loan_id: string;
      agent_addr: string;
      data?: Record<string, unknown>;
    };

    const notification = await Notification.create({
      type,
      loan_id,
      agent_addr: agent_addr.toLowerCase(),
      data: data ?? {},
    });

    res.json({ success: true, id: notification.id });
  } catch (err) {
    next(err);
  }
});
