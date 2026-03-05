import { Router } from "express";
import { Op } from "sequelize";
import { verifyMessage } from "viem";
import { registerPayloadSchema } from "@clawback-network/protocol";
import { Agent } from "../models/Agent.js";
import { CreditLineModel } from "../models/CreditLine.js";
import { CreditBacking } from "../models/CreditBacking.js";
import { FeedbackEvent } from "../models/FeedbackEvent.js";
import type { Erc8004Feedback } from "../services/erc8004.js";
import {
  registrationLimiter,
  searchLimiter,
  readLimiter,
} from "../middleware/rateLimit.js";
import { fetchErc8004Profile } from "../services/erc8004.js";
import { config } from "../config.js";

const SIGNATURE_MAX_AGE_SECONDS = 300; // 5 minutes

export const agentsRouter = Router();

/**
 * POST /agents/register
 * Register or update an agent profile (flat payload).
 */
agentsRouter.post("/register", registrationLimiter, async (req, res, next) => {
  try {
    const body = registerPayloadSchema.parse(req.body);
    const addr = body.address.toLowerCase();

    // Verify signature proves ownership of the address
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - body.timestamp) > SIGNATURE_MAX_AGE_SECONDS) {
      res.status(401).json({
        error: "Signature expired — timestamp too old or too far in the future",
      });
      return;
    }

    const message = `clawback-register:${addr}:${body.timestamp}`;
    let valid = false;
    try {
      valid = await verifyMessage({
        address: addr as `0x${string}`,
        message,
        signature: body.signature as `0x${string}`,
      });
    } catch {
      // verifyMessage throws on malformed signatures
    }

    if (!valid) {
      res
        .status(401)
        .json({ error: "Invalid signature — does not match address" });
      return;
    }

    let agent = await Agent.findByPk(addr);

    if (agent) {
      await agent.update({
        name: body.name,
        bio: body.bio ?? agent.bio,
        icon_url: body.iconUrl ?? agent.icon_url,
      });
    } else {
      agent = await Agent.create({
        address: addr,
        name: body.name,
        bio: body.bio ?? null,
        country: null,
        icon_url: body.iconUrl ?? null,
        erc8004_profile: null,
      });
    }

    // Fetch ERC-8004 data in background (don't block response)
    fetchErc8004Profile(addr, config.chainId)
      .then(async (profile) => {
        if (profile) {
          await Agent.update(
            { erc8004_profile: profile as unknown as Record<string, unknown> },
            { where: { address: addr } },
          );
        }
      })
      .catch((err) =>
        console.warn("[erc8004] Lookup failed:", (err as Error).message),
      );

    const totalAgents = await Agent.count();

    res.json({ success: true, agentNumber: totalAgents });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /agents/search
 * Search agents by query text.
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
          iconUrl: a.icon_url ?? null,
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
          erc8004Profile: a.erc8004_profile ?? null,
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

    // Merge feedbacks from our DB with cached erc8004_profile
    const erc8004Profile = agent.erc8004_profile
      ? { ...(agent.erc8004_profile as Record<string, unknown>) }
      : null;

    if (erc8004Profile) {
      // Query DB feedbacks by agent_addr or by token_id from profile
      const tokenId = (erc8004Profile.agent as Record<string, unknown> | null)
        ?.token_id as string | undefined;

      const dbFeedbacks = await FeedbackEvent.findAll({
        where: {
          [Op.or]: [
            ...(addr ? [{ agent_addr: addr }] : []),
            ...(tokenId ? [{ agent_token_id: tokenId }] : []),
          ],
        },
        order: [["event_timestamp", "DESC"]],
        limit: 50,
      });

      // Map DB rows to Erc8004Feedback shape
      const dbMapped: Erc8004Feedback[] = dbFeedbacks.map((f) => ({
        score: f.value / 10 ** f.value_decimals,
        value: f.value.toString(),
        comment: null,
        tag1: f.tag1,
        tag2: f.tag2,
        user_address: f.user_address,
        transaction_hash: f.tx_hash,
        is_revoked: false,
        submitted_at: f.event_timestamp.toISOString(),
        feedback_uri: f.feedback_uri,
        feedback_hash: f.feedback_hash,
      }));

      // Merge: use DB feedbacks, dedup by tx_hash with any cached ones
      const cachedFeedbacks = (erc8004Profile.feedbacks ??
        []) as Erc8004Feedback[];
      const seenTxHashes = new Set(
        dbMapped.map((f) => f.transaction_hash.toLowerCase()),
      );
      const merged = [
        ...dbMapped,
        ...cachedFeedbacks.filter(
          (f) => !seenTxHashes.has(f.transaction_hash.toLowerCase()),
        ),
      ];
      // Enrich feedbacks with assessor ERC-8004 agent info
      const assessorAddrs = [
        ...new Set(merged.map((f) => f.user_address.toLowerCase())),
      ];
      const assessorAgents = assessorAddrs.length
        ? await Agent.findAll({ where: { address: assessorAddrs } })
        : [];
      const assessorMap = new Map(assessorAgents.map((a) => [a.address, a]));

      erc8004Profile.feedbacks = merged.map((f) => {
        const assessorAgent = assessorMap.get(f.user_address.toLowerCase());
        const profile = assessorAgent?.erc8004_profile as Record<
          string,
          unknown
        > | null;
        const agentData = profile?.agent as Record<string, unknown> | null;
        return {
          ...f,
          assessor: agentData
            ? {
                address: assessorAgent!.address,
                name: agentData.name as string,
                image_url: (agentData.image_url as string) ?? null,
                token_id: agentData.token_id as string,
              }
            : null,
        };
      });
    }

    res.json({
      address: agent.address,
      name: agent.name,
      bio: agent.bio,
      registeredAt: agent.createdAt?.toISOString(),
      country: agent.country ?? null,
      erc8004Profile,
      creditLine: creditData,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /agents/:address/erc8004/refresh
 * Re-fetch ERC-8004 data for an agent.
 */
agentsRouter.get(
  "/:address/erc8004/refresh",
  readLimiter,
  async (req, res, next) => {
    try {
      const addr = (req.params.address as string).toLowerCase();
      const agent = await Agent.findByPk(addr);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      const profile = await fetchErc8004Profile(addr, config.chainId);
      if (profile) {
        await agent.update({
          erc8004_profile: profile as unknown as Record<string, unknown>,
        });
      }

      res.json({
        address: addr,
        erc8004Profile: profile ?? null,
      });
    } catch (err) {
      next(err);
    }
  },
);
