import "dotenv/config";

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
  /** ClawBackLending contract address. If empty, lending indexer is disabled. */
  contractAddress: (process.env.CONTRACT_ADDRESS || "") as `0x${string}` | "",
  /** ClawBackCreditLine contract address. If empty, credit line indexer is disabled. */
  creditLineContractAddress: (process.env.CREDIT_LINE_CONTRACT_ADDRESS ||
    "") as `0x${string}` | "",
  /** Polling interval in milliseconds (~1 Base L2 block) */
  indexerIntervalMs: parseInt(process.env.INDEXER_INTERVAL_MS || "12000", 10),
  /** Block number to start indexing from (contract deployment block) */
  indexerStartBlock: parseInt(process.env.INDEXER_START_BLOCK || "0", 10),
  /** Max blocks to fetch per polling tick */
  indexerBatchSize: parseInt(process.env.INDEXER_BATCH_SIZE || "2000", 10),
};
