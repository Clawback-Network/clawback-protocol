import { Router } from "express";
import { Op } from "sequelize";
import { registerPayloadSchema } from "@clawback-network/protocol";
import type { AgentCard } from "@a2a-js/sdk";
import { Agent } from "../models/Agent.js";
import { AgentLendingMetrics } from "../models/AgentLendingMetrics.js";
import { CreditLineModel } from "../models/CreditLine.js";
import { CreditBacking } from "../models/CreditBacking.js";
import {
  registrationLimiter,
  searchLimiter,
  readLimiter,
} from "../middleware/rateLimit.js";

export const agentsRouter = Router();

/**
 * POST /agents/register
 * Register or update an agent profile with an AgentCard.
 */
agentsRouter.post("/register", registrationLimiter, async (req, res, next) => {
  try {
    const body = registerPayloadSchema.parse(req.body);
    const addr = body.address.toLowerCase();
    const agentCard: AgentCard = body.agentCard;

    // Extract flat fields from AgentCard for search/stats compat
    const name = agentCard.name;
    const description = agentCard.description || null;
    const skillTags = agentCard.skills.flatMap((s) => s.tags);
    const iconUrl = (agentCard as unknown as Record<string, unknown>)
      .iconUrl as string | undefined;
    const fundingAddress = (agentCard as unknown as Record<string, unknown>)
      .fundingAddress as string | undefined;

    let agent = await Agent.findByPk(addr);

    if (agent) {
      await agent.update({
        name,
        bio: description,
        skills: skillTags,
        version: agentCard.protocolVersion ?? agent.version,
        clawback_version: agentCard.version || agent.clawback_version,
        agent_card: agentCard,
        icon_url: iconUrl || agent.icon_url,
        funding_address: fundingAddress || agent.funding_address,
      });
    } else {
      agent = await Agent.create({
        address: addr,
        name,
        bio: description,
        skills: skillTags,
        version: agentCard.protocolVersion || null,
        clawback_version: agentCard.version || null,
        agent_card: agentCard,
        messages_sent: 0,
        icon_url: iconUrl || null,
        funding_address: fundingAddress || null,
      });
    }

    const totalAgents = await Agent.count();

    res.json({ success: true, agentNumber: totalAgents });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /agents/search
 * Search agents by query text or online status.
 */
agentsRouter.get("/search", searchLimiter, async (req, res, next) => {
  try {
    const { q } = req.query;
    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit as string) || 20),
      100,
    );
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const where: Record<string, unknown> = {};

    if (q && typeof q === "string") {
      where[Op.or as unknown as string] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { bio: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const { rows: agents, count: total } = await Agent.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    // Bulk-fetch credit lines for all returned agents
    const addrs = agents.map((a) => a.address);
    const creditLines = addrs.length
      ? await CreditLineModel.findAll({ where: { borrower_addr: addrs } })
      : [];
    const creditMap = new Map(creditLines.map((cl) => [cl.borrower_addr, cl]));

    res.json({
      agents: agents.map((a) => {
        const cl = creditMap.get(a.address);
        return {
          address: a.address,
          name: a.name,
          bio: a.bio,
          skills: a.skills,
          agentCard: a.agent_card,
          iconUrl: a.icon_url ?? null,
          fundingAddress: a.funding_address ?? null,
          registeredAt: a.createdAt?.toISOString(),
          country: a.country ?? null,
          creditLine: cl
            ? {
                total_backing: cl.total_backing,
                total_drawn: cl.total_drawn,
                available_credit: cl.total_backing - cl.total_drawn,
                blended_apr: 0,
                status: cl.status,
                backer_count: cl.backer_count,
              }
            : null,
          erc8004: cl?.agent_id ? { agentId: cl.agent_id } : null,
        };
      }),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /agents/:address/lending
 * Get lending metrics for an agent.
 */
agentsRouter.get("/:address/lending", readLimiter, async (req, res, next) => {
  try {
    const addr = (req.params.address as string).toLowerCase();
    const metrics = await AgentLendingMetrics.findByPk(addr);

    if (!metrics) {
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
 * GET /agents/:address
 * Get a single agent profile by address.
 */
agentsRouter.get("/:address", readLimiter, async (req, res, next) => {
  try {
    const addr = (req.params.address as string).toLowerCase();
    const agent = await Agent.findByPk(addr);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    // Fetch credit line data if available
    const creditLine = await CreditLineModel.findByPk(addr);
    let creditData = null;
    if (creditLine) {
      const backings = await CreditBacking.findAll({
        where: { borrower_addr: addr, active: true },
      });
      let blendedApr = 0;
      if (creditLine.total_backing > 0) {
        let weightedSum = 0;
        for (const b of backings) {
          weightedSum += b.max_amount * b.apr;
        }
        blendedApr = weightedSum / creditLine.total_backing;
      }
      creditData = {
        total_backing: creditLine.total_backing,
        total_drawn: creditLine.total_drawn,
        available_credit: creditLine.total_backing - creditLine.total_drawn,
        blended_apr: blendedApr,
        status: creditLine.status,
        backer_count: creditLine.backer_count,
      };
    }

    // ERC-8004 data
    const erc8004 = creditLine?.agent_id
      ? { agentId: creditLine.agent_id }
      : null;

    res.json({
      address: agent.address,
      name: agent.name,
      bio: agent.bio,
      skills: agent.skills,
      agentCard: agent.agent_card,
      registeredAt: agent.createdAt?.toISOString(),
      country: agent.country ?? null,
      fundingAddress: agent.funding_address ?? null,
      creditLine: creditData,
      erc8004,
    });
  } catch (err) {
    next(err);
  }
});
