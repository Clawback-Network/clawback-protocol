import { Router } from "express";
import { Op } from "sequelize";
import {
  registerPayloadSchema,
  heartbeatPayloadSchema,
} from "@clawback/protocol";
import type { AgentCard } from "@a2a-js/sdk";
import { verifyMessage, getAddress } from "viem";
import type { Hex } from "viem";
import { Agent } from "../models/Agent.js";
import { AgentLendingMetrics } from "../models/AgentLendingMetrics.js";
import {
  registrationLimiter,
  searchLimiter,
  heartbeatLimiter,
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
        availability: "online",
        last_heartbeat: new Date(),
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
        availability: "online",
        version: agentCard.protocolVersion || null,
        clawback_version: agentCard.version || null,
        last_heartbeat: new Date(),
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
    const { q, online } = req.query;
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

    if (online === "true") {
      where.availability = "online";
    }

    const { rows: agents, count: total } = await Agent.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    res.json({
      agents: agents.map((a) => ({
        address: a.address,
        name: a.name,
        bio: a.bio,
        skills: a.skills,
        availability: a.availability,
        agentCard: a.agent_card,
        iconUrl: a.icon_url ?? null,
        fundingAddress: a.funding_address ?? null,
        registeredAt: a.created_at?.toISOString(),
        lastHeartbeat: a.last_heartbeat?.toISOString(),
        country: a.country ?? null,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /agents/heartbeat
 * Update agent heartbeat timestamp.
 */
agentsRouter.post("/heartbeat", heartbeatLimiter, async (req, res, next) => {
  try {
    const body = heartbeatPayloadSchema.parse(req.body);

    // Verify timestamp is within 5-minute window
    const nowSeconds = Math.floor(Date.now() / 1000);
    const MAX_TIMESTAMP_DRIFT_SECONDS = 300;
    if (Math.abs(nowSeconds - body.timestamp) > MAX_TIMESTAMP_DRIFT_SECONDS) {
      res.status(401).json({ error: "Timestamp out of range" });
      return;
    }

    // Verify signature proves ownership of the address
    const message = `clawback-heartbeat:${body.address}:${body.timestamp}`;
    let valid = false;
    try {
      valid = await verifyMessage({
        address: getAddress(body.address) as Hex,
        message,
        signature: body.signature as Hex,
      });
    } catch {
      // viem throws on malformed signatures
    }
    if (!valid) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const addr = body.address.toLowerCase();
    const agent = await Agent.findByPk(addr);
    if (!agent) {
      res.status(404).json({ error: "Agent not registered" });
      return;
    }

    const telemetry = body.telemetry;
    const deltaMessages = Math.max(0, telemetry?.messagesSent ?? 0);

    const updatedFields: Record<string, unknown> = {
      last_heartbeat: new Date(),
      availability: "online",
      messages_sent: (agent.messages_sent ?? 0) + deltaMessages,
    };

    if (telemetry?.country) {
      updatedFields.country = telemetry.country;
    }

    await agent.update(updatedFields);

    const totalAgents = await Agent.count();
    const onlineAgents = await Agent.count({
      where: { availability: "online" },
    });

    res.json({
      success: true,
      stats: { totalAgents, onlineAgents },
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
    const agent = await Agent.findByPk(
      (req.params.address as string).toLowerCase(),
    );
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    res.json({
      address: agent.address,
      name: agent.name,
      bio: agent.bio,
      skills: agent.skills,
      availability: agent.availability,
      agentCard: agent.agent_card,
      registeredAt: agent.created_at?.toISOString(),
      lastHeartbeat: agent.last_heartbeat?.toISOString(),
      country: agent.country ?? null,
      fundingAddress: agent.funding_address ?? null,
    });
  } catch (err) {
    next(err);
  }
});
