import "dotenv/config";
import { CREDIT_LINE_CONTRACT_ADDRESS } from "@clawback-network/protocol";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://clawback:clawback@localhost:5432/clawback",
  nodeEnv: process.env.NODE_ENV || "development",
  /** Minutes before an agent is considered offline (for stats only) */
  offlineThresholdMinutes: 20,
  /** Snapshot capture interval in milliseconds (10 min) */
  snapshotIntervalMs: 10 * 60 * 1000,

  // ─── Indexer ────────────────────────────────────────────────
  /** JSON-RPC URL for the chain (Base L2). Required for indexer. */
  rpcUrl: process.env.RPC_URL || "",
  /** ClawBackCreditLine contract address */
  creditLineContractAddress: CREDIT_LINE_CONTRACT_ADDRESS,
  /** Polling interval in milliseconds */
  indexerIntervalMs: parseInt(process.env.INDEXER_INTERVAL_MS || "30000", 10),
  /** Block number to start indexing from (contract deployment block) */
  indexerStartBlock: parseInt(process.env.INDEXER_START_BLOCK || "0", 10),
  /** Max blocks to fetch per polling tick */
  indexerBatchSize: parseInt(process.env.INDEXER_BATCH_SIZE || "2000", 10),
  /** Chain ID for tx-building endpoints (default: Base mainnet) */
  chainId: parseInt(process.env.CHAIN_ID || "8453", 10),

  // ─── ERC-8004 ─────────────────────────────────────────────
  /** 8004scan API base URL */
  erc8004ApiUrl:
    process.env.ERC8004_API_URL || "https://www.8004scan.io/api/v1/public",

  // ─── Pinata IPFS ──────────────────────────────────────────
  pinataApiKey: process.env.PINATA_API_KEY || "",
  pinataSecretKey: process.env.PINATA_SECRET_KEY || "",
};
