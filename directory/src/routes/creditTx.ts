import { Router } from "express";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  keccak256,
  toHex,
  type PublicClient,
} from "viem";
import {
  getChainConfig,
  CREDIT_LINE_CONTRACT_ADDRESS,
  IDENTITY_REGISTRY_ADDRESS,
} from "@clawback-network/protocol";
import {
  clawBackCreditLineAbi,
  erc20Abi,
  reputationRegistryAbi,
  identityRegistryAbi,
} from "../contractAbi.js";
import { config } from "../config.js";
import { Agent } from "../models/Agent.js";
import { pinJsonToIpfs } from "../services/pinata.js";
import { fetchAgent, fetchAllAgentsByOwner } from "../services/erc8004.js";
import { FeedbackEvent } from "../models/FeedbackEvent.js";

export const creditTxRouter = Router();

// ─── Helpers ────────────────────────────────────────────────

function parseUsdc(amount: number): bigint {
  return BigInt(Math.round(amount * 1e6));
}

function aprToBps(apr: number): bigint {
  return BigInt(Math.round(apr * 100));
}

let cachedClient: PublicClient | null = null;

function getPublicClient(): PublicClient {
  if (cachedClient) return cachedClient;
  const chain = getChainConfig(config.chainId);
  const rpcUrl = config.rpcUrl || chain.rpcUrl;
  cachedClient = createPublicClient({ transport: http(rpcUrl) });
  return cachedClient;
}

async function checkAllowance(
  owner: `0x${string}`,
  spender: `0x${string}`,
): Promise<bigint> {
  const chain = getChainConfig(config.chainId);
  const client = getPublicClient();
  const result = await client.readContract({
    address: chain.usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });
  return result as bigint;
}

interface TxPayload {
  to: string;
  data: string;
}

function buildApproveTx(spender: string, amount: bigint): TxPayload {
  const chain = getChainConfig(config.chainId);
  return {
    to: chain.usdcAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [spender as `0x${string}`, amount],
    }),
  };
}

async function buildTxResponse(
  from: `0x${string}`,
  requiredAllowance: bigint | null,
  actionTx: TxPayload,
): Promise<{ transactions: TxPayload[] }> {
  const txs: TxPayload[] = [];

  if (requiredAllowance !== null && requiredAllowance > 0n) {
    const currentAllowance = await checkAllowance(
      from,
      CREDIT_LINE_CONTRACT_ADDRESS,
    );
    if (currentAllowance < requiredAllowance) {
      txs.push(buildApproveTx(CREDIT_LINE_CONTRACT_ADDRESS, requiredAllowance));
    }
  }

  txs.push(actionTx);
  return { transactions: txs };
}

// ─── Endpoints ──────────────────────────────────────────────

/** POST /credit/tx/back */
creditTxRouter.post("/back", async (req, res, next) => {
  try {
    const { from, borrower, amount, apr } = req.body;
    const usdcAmount = parseUsdc(amount);
    const bps = aprToBps(apr);

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "backAgent",
      args: [borrower as `0x${string}`, usdcAmount, bps],
    });

    const result = await buildTxResponse(from as `0x${string}`, usdcAmount, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/adjust */
creditTxRouter.post("/adjust", async (req, res, next) => {
  try {
    const { from, borrower, amount, apr } = req.body;
    const usdcAmount = parseUsdc(amount);
    const bps = aprToBps(apr);

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "adjustBacking",
      args: [borrower as `0x${string}`, usdcAmount, bps],
    });

    const result = await buildTxResponse(from as `0x${string}`, usdcAmount, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/withdraw */
creditTxRouter.post("/withdraw", async (req, res, next) => {
  try {
    const { from, borrower } = req.body;

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "withdrawBacking",
      args: [borrower as `0x${string}`],
    });

    const result = await buildTxResponse(from as `0x${string}`, null, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/draw */
creditTxRouter.post("/draw", async (req, res, next) => {
  try {
    const { from, amount, maxApr } = req.body;
    const usdcAmount = parseUsdc(amount);
    const maxAprBps = BigInt(maxApr ?? 5000); // default MAX_APR

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "draw",
      args: [usdcAmount, maxAprBps],
    });

    const result = await buildTxResponse(from as `0x${string}`, null, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/remove-backer */
creditTxRouter.post("/remove-backer", async (req, res, next) => {
  try {
    const { from, backer } = req.body;

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "removeBacker",
      args: [backer as `0x${string}`],
    });

    const result = await buildTxResponse(from as `0x${string}`, null, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/repay */
creditTxRouter.post("/repay", async (req, res, next) => {
  try {
    const { from, amount } = req.body;
    const usdcAmount = parseUsdc(amount);

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "repay",
      args: [usdcAmount],
    });

    const result = await buildTxResponse(from as `0x${string}`, usdcAmount, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/claim-interest */
creditTxRouter.post("/claim-interest", async (req, res, next) => {
  try {
    const { from, borrower } = req.body;

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "claimInterest",
      args: [borrower as `0x${string}`],
    });

    const result = await buildTxResponse(from as `0x${string}`, null, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/claim-capital */
creditTxRouter.post("/claim-capital", async (req, res, next) => {
  try {
    const { from, borrower } = req.body;

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "claimCapital",
      args: [borrower as `0x${string}`],
    });

    const result = await buildTxResponse(from as `0x${string}`, null, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/trigger-default */
creditTxRouter.post("/trigger-default", async (req, res, next) => {
  try {
    const { from, borrower } = req.body;

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "triggerDefault",
      args: [borrower as `0x${string}`],
    });

    const result = await buildTxResponse(from as `0x${string}`, null, {
      to: CREDIT_LINE_CONTRACT_ADDRESS,
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/feedback — build giveFeedback tx + pin analysis to IPFS */
creditTxRouter.post("/feedback", async (req, res, next) => {
  try {
    const { from, agentId, address, score, analysis } = req.body;

    // Must provide at least one of agentId or address
    if (!agentId && !address) {
      res.status(400).json({ error: "Must provide agentId or address" });
      return;
    }

    // Validate score
    const numScore = Number(score);
    if (!Number.isInteger(numScore) || numScore < 0 || numScore > 100) {
      res.status(400).json({ error: "Score must be an integer 0–100" });
      return;
    }

    let tokenId: string | undefined;
    let borrowerAddr: string | undefined;

    if (agentId) {
      // Path A: agentId provided — resolve directly via 8004scan
      const erc8004Agent = await fetchAgent(config.chainId, String(agentId));
      if (!erc8004Agent) {
        res.status(404).json({ error: `ERC-8004 agent ${agentId} not found` });
        return;
      }
      tokenId = erc8004Agent.token_id;
      borrowerAddr = erc8004Agent.owner_address?.toLowerCase();
    } else {
      // Path B/C: address provided
      const addr = (address as string).toLowerCase();
      borrowerAddr = addr;

      // First try DB lookup
      const agent = await Agent.findByPk(addr);
      const profile = agent?.erc8004_profile as Record<string, unknown> | null;
      const agentData = profile?.agent as Record<string, unknown> | null;
      tokenId = agentData?.token_id as string | undefined;

      // If not in DB, try 8004scan
      if (!tokenId) {
        const agents = await fetchAllAgentsByOwner(addr, config.chainId);
        if (agents.length > 1) {
          res.status(400).json({
            error:
              "Multiple ERC-8004 agents found for this address. Please specify agentId directly.",
          });
          return;
        }
        if (agents.length === 1) {
          tokenId = agents[0].token_id;
        }
      }
    }

    // Build analysis JSON for IPFS
    const analysisPayload: Record<string, unknown> = {
      protocol: "clawback",
      type: "credit-assessment",
      borrower: borrowerAddr ?? "",
      assessor: (from as string).toLowerCase(),
      score: numScore,
      analysis: analysis ?? {},
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Hash the analysis content
    const analysisJson = JSON.stringify(analysisPayload);
    const contentHash = keccak256(toHex(analysisJson));

    // Pin to IPFS
    const cid = await pinJsonToIpfs(
      analysisPayload,
      `clawback-feedback-${borrowerAddr ?? "unknown"}-${Date.now()}`,
    );
    const feedbackURI = `ipfs://${cid}`;

    if (!tokenId) {
      // Path C: no ERC-8004 identity — store off-chain only
      await FeedbackEvent.create({
        agent_token_id: null,
        agent_addr: borrowerAddr ?? null,
        user_address: (from as string).toLowerCase(),
        feedback_index: 0,
        value: numScore,
        value_decimals: 0,
        tag1: "credit",
        tag2: "assessment",
        feedback_uri: feedbackURI,
        feedback_hash: contentHash,
        block_number: null,
        tx_hash: null,
        event_timestamp: new Date(),
      });

      res.json({ offchain: true, feedbackURI, contentHash });
      return;
    }

    // Path A/B: encode giveFeedback calldata
    const data = encodeFunctionData({
      abi: reputationRegistryAbi,
      functionName: "giveFeedback",
      args: [
        BigInt(tokenId),
        BigInt(numScore),
        0,
        "credit",
        "assessment",
        "",
        feedbackURI,
        contentHash as `0x${string}`,
      ],
    });

    const chainConfig = getChainConfig(config.chainId);
    res.json({
      transactions: [{ to: chainConfig.reputationRegistryAddress, data }],
      feedbackURI,
      contentHash,
    });
  } catch (err) {
    next(err);
  }
});

/** POST /credit/tx/register-8004 — build ERC-8004 Identity Registry register tx */
creditTxRouter.post("/register-8004", async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }

    // Build agent metadata JSON for IPFS
    const metadata: Record<string, unknown> = {
      name,
      description: description ?? "",
      protocols: ["clawback"],
      created_at: new Date().toISOString(),
    };

    // Pin to IPFS
    const cid = await pinJsonToIpfs(metadata, `clawback-agent-${name}`);
    const agentURI = `ipfs://${cid}`;

    // Encode register(string agentURI) calldata
    const data = encodeFunctionData({
      abi: identityRegistryAbi,
      functionName: "register",
      args: [agentURI],
    });

    res.json({
      transactions: [{ to: IDENTITY_REGISTRY_ADDRESS, data }],
      agentURI,
    });
  } catch (err) {
    next(err);
  }
});
