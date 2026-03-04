import type { Transaction } from "sequelize";
import { createPublicClient, defineChain, http, type Log } from "viem";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { clawBackCreditLineAbi } from "./contractAbi.js";
import { IndexerState } from "./models/IndexerState.js";
import { CreditLineModel } from "./models/CreditLine.js";
import { CreditBacking } from "./models/CreditBacking.js";
import { CreditEvent } from "./models/CreditEvent.js";
import { Agent } from "./models/Agent.js";
import { fetchErc8004Profile } from "./services/erc8004.js";

// ─── Helpers ────────────────────────────────────────────────────

const USDC_DECIMALS = 6;

/** Convert raw USDC bigint (6 decimals) to a human-readable number. */
function toUsdc(raw: bigint): number {
  return Number(raw) / 10 ** USDC_DECIMALS;
}

/** Convert basis points to human-readable percentage (1000 → 10.0). */
function bpsToPercent(bps: bigint): number {
  return Number(bps) / 100;
}

// ─── Indexer State ──────────────────────────────────────────────

let client: ReturnType<typeof createPublicClient>;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;
let stopped = false;

// Cache block timestamps within a batch to avoid repeated getBlock calls
const blockTimestampCache = new Map<number, Date>();

async function getBlockTimestamp(blockNumber: number): Promise<Date> {
  const cached = blockTimestampCache.get(blockNumber);
  if (cached) return cached;

  const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });
  const ts = new Date(Number(block.timestamp) * 1000);
  blockTimestampCache.set(blockNumber, ts);
  return ts;
}

// ─── Credit Line Event Handlers ─────────────────────────────────

type CreditLog = Log<
  bigint,
  number,
  false,
  undefined,
  true,
  typeof clawBackCreditLineAbi
>;

async function handleAgentBacked(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { borrower, backer, amount, apr } = log.args as {
    borrower: `0x${string}`;
    backer: `0x${string}`;
    amount: bigint;
    apr: bigint;
  };
  const blockNum = Number(log.blockNumber);
  const amountUsdc = toUsdc(amount);

  await CreditBacking.findOrCreate({
    where: {
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: backer.toLowerCase(),
    },
    defaults: {
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: backer.toLowerCase(),
      max_amount: amountUsdc,
      apr: bpsToPercent(apr),
      drawn_amount: 0,
      accrued_interest: 0,
      earned_interest: 0,
      active: true,
      block_number: blockNum,
    },
    transaction: tx,
  });

  const [creditLine] = await CreditLineModel.findOrCreate({
    where: { borrower_addr: borrower.toLowerCase() },
    defaults: {
      borrower_addr: borrower.toLowerCase(),
      total_backing: 0,
      total_drawn: 0,
      total_repaid: 0,
      total_interest_paid: 0,
      backer_count: 0,
      status: "active",
      last_repayment_at: null,
      block_number: blockNum,
    },
    transaction: tx,
  });

  await creditLine.increment("total_backing", {
    by: amountUsdc,
    transaction: tx,
  });
  await creditLine.increment("backer_count", { by: 1, transaction: tx });

  await CreditEvent.create(
    {
      event_type: "agent_backed",
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: backer.toLowerCase(),
      amount: amountUsdc,
      apr: bpsToPercent(apr),
      block_number: blockNum,
      tx_hash: log.transactionHash!,
      event_timestamp: await getBlockTimestamp(blockNum),
    },
    { transaction: tx },
  );

  // Auto-create stub agent profile if borrower isn't registered yet
  const addr = borrower.toLowerCase();
  const [, created] = await Agent.findOrCreate({
    where: { address: addr },
    defaults: {
      address: addr,
      name: `Agent ${addr.slice(0, 8)}...`,
      bio: null,
      country: null,
      icon_url: null,
      erc8004_profile: null,
    },
    transaction: tx,
  });

  if (created) {
    // Fetch ERC-8004 data async (outside the DB transaction)
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
        console.warn("[indexer] ERC-8004 lookup failed for stub:", (err as Error).message),
      );
    console.log(`[indexer] Created stub agent profile for ${addr}`);
  }
}

async function handleBackingAdjusted(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { borrower, backer, newAmount, newApr } = log.args as {
    borrower: `0x${string}`;
    backer: `0x${string}`;
    newAmount: bigint;
    newApr: bigint;
  };
  const newAmountUsdc = toUsdc(newAmount);

  const backing = await CreditBacking.findOne({
    where: {
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: backer.toLowerCase(),
    },
    transaction: tx,
  });

  if (backing) {
    const oldAmount = backing.max_amount;
    await backing.update(
      { max_amount: newAmountUsdc, apr: bpsToPercent(newApr) },
      { transaction: tx },
    );

    const delta = newAmountUsdc - oldAmount;
    if (delta !== 0) {
      await CreditLineModel.increment("total_backing", {
        by: delta,
        where: { borrower_addr: borrower.toLowerCase() },
        transaction: tx,
      });
    }
  }

  await CreditEvent.create(
    {
      event_type: "backing_adjusted",
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: backer.toLowerCase(),
      amount: newAmountUsdc,
      apr: bpsToPercent(newApr),
      block_number: Number(log.blockNumber),
      tx_hash: log.transactionHash!,
      event_timestamp: await getBlockTimestamp(Number(log.blockNumber)),
    },
    { transaction: tx },
  );
}

async function handleBackingWithdrawn(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { borrower, backer } = log.args as {
    borrower: `0x${string}`;
    backer: `0x${string}`;
    amount: bigint;
  };

  const backing = await CreditBacking.findOne({
    where: {
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: backer.toLowerCase(),
    },
    transaction: tx,
  });

  if (backing) {
    const withdrawnAmount = backing.max_amount;
    await backing.update({ active: false, max_amount: 0 }, { transaction: tx });

    await CreditLineModel.increment("total_backing", {
      by: -withdrawnAmount,
      where: { borrower_addr: borrower.toLowerCase() },
      transaction: tx,
    });
    await CreditLineModel.decrement("backer_count", {
      by: 1,
      where: { borrower_addr: borrower.toLowerCase() },
      transaction: tx,
    });

    await CreditEvent.create(
      {
        event_type: "backing_withdrawn",
        borrower_addr: borrower.toLowerCase(),
        assessor_addr: backer.toLowerCase(),
        amount: withdrawnAmount,
        apr: null,
        block_number: Number(log.blockNumber),
        tx_hash: log.transactionHash!,
        event_timestamp: await getBlockTimestamp(Number(log.blockNumber)),
      },
      { transaction: tx },
    );
  }
}

async function handleCreditDrawn(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { borrower, amount, newOutstanding } = log.args as {
    borrower: `0x${string}`;
    amount: bigint;
    newOutstanding: bigint;
  };

  await CreditLineModel.update(
    { total_drawn: toUsdc(newOutstanding) },
    {
      where: { borrower_addr: borrower.toLowerCase() },
      transaction: tx,
    },
  );

  // Update individual backer drawn amounts by reading from contract
  if (config.creditLineContractAddress) {
    const backers = await CreditBacking.findAll({
      where: { borrower_addr: borrower.toLowerCase(), active: true },
      transaction: tx,
    });
    for (const b of backers) {
      try {
        const backing = await client.readContract({
          address: config.creditLineContractAddress as `0x${string}`,
          abi: clawBackCreditLineAbi,
          functionName: "getBacking",
          args: [borrower, b.assessor_addr as `0x${string}`],
        });
        await b.update(
          { drawn_amount: toUsdc(backing.drawnAmount) },
          { transaction: tx },
        );
      } catch {
        // Skip individual backer update on read failure
      }
    }
  }

  await CreditEvent.create(
    {
      event_type: "credit_drawn",
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: null,
      amount: toUsdc(amount),
      apr: null,
      block_number: Number(log.blockNumber),
      tx_hash: log.transactionHash!,
      event_timestamp: await getBlockTimestamp(Number(log.blockNumber)),
    },
    { transaction: tx },
  );
}

async function handleCreditRepaymentMade(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { borrower, principalPaid, interestPaid, newOutstanding } =
    log.args as {
      borrower: `0x${string}`;
      principalPaid: bigint;
      interestPaid: bigint;
      newOutstanding: bigint;
    };
  const blockNum = Number(log.blockNumber);
  const blockTs = await getBlockTimestamp(blockNum);

  await CreditLineModel.update(
    {
      total_drawn: toUsdc(newOutstanding),
      last_repayment_at: blockTs,
    },
    {
      where: { borrower_addr: borrower.toLowerCase() },
      transaction: tx,
    },
  );
  await CreditLineModel.increment("total_repaid", {
    by: toUsdc(principalPaid) + toUsdc(interestPaid),
    where: { borrower_addr: borrower.toLowerCase() },
    transaction: tx,
  });
  await CreditLineModel.increment("total_interest_paid", {
    by: toUsdc(interestPaid),
    where: { borrower_addr: borrower.toLowerCase() },
    transaction: tx,
  });

  await CreditEvent.create(
    {
      event_type: "repayment_made",
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: null,
      amount: toUsdc(principalPaid) + toUsdc(interestPaid),
      apr: null,
      block_number: blockNum,
      tx_hash: log.transactionHash!,
      event_timestamp: blockTs,
    },
    { transaction: tx },
  );
}

async function handleCreditLineDefaulted(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { borrower, outstanding } = log.args as {
    borrower: `0x${string}`;
    outstanding: bigint;
    triggeredBy: `0x${string}`;
  };

  await CreditLineModel.update(
    { status: "defaulted" },
    {
      where: { borrower_addr: borrower.toLowerCase() },
      transaction: tx,
    },
  );

  await CreditBacking.update(
    { active: false },
    {
      where: { borrower_addr: borrower.toLowerCase() },
      transaction: tx,
    },
  );

  await CreditEvent.create(
    {
      event_type: "credit_line_defaulted",
      borrower_addr: borrower.toLowerCase(),
      assessor_addr: null,
      amount: toUsdc(outstanding),
      apr: null,
      block_number: Number(log.blockNumber),
      tx_hash: log.transactionHash!,
      event_timestamp: await getBlockTimestamp(Number(log.blockNumber)),
    },
    { transaction: tx },
  );
}

// ─── Event Dispatch ─────────────────────────────────────────────

const CREDIT_EVENT_HANDLERS: Record<
  string,
  (log: CreditLog, tx: Transaction) => Promise<void>
> = {
  AgentBacked: handleAgentBacked,
  BackingAdjusted: handleBackingAdjusted,
  BackingWithdrawn: handleBackingWithdrawn,
  CreditDrawn: handleCreditDrawn,
  RepaymentMade: handleCreditRepaymentMade,
  CreditLineDefaulted: handleCreditLineDefaulted,
};

// ─── Core Polling Loop ──────────────────────────────────────────

async function processBatch(): Promise<void> {
  if (isProcessing || stopped) return;
  isProcessing = true;

  try {
    const latestBlock = Number(await client.getBlockNumber());

    // Get or create cursor — default to lookback window, never block 0
    const [state] = await IndexerState.findOrCreate({
      where: { id: 1 },
      defaults: {
        id: 1,
        last_block_number: Math.max(0, latestBlock - LOOKBACK_BLOCKS),
      },
    });

    const fromBlock = state.last_block_number + 1;

    if (fromBlock > latestBlock) {
      return; // nothing new
    }

    const toBlock = Math.min(
      fromBlock + config.indexerBatchSize - 1,
      latestBlock,
    );

    // Fetch credit line contract events
    const creditLogs = config.creditLineContractAddress
      ? await client.getContractEvents({
          address: config.creditLineContractAddress as `0x${string}`,
          abi: clawBackCreditLineAbi,
          fromBlock: BigInt(fromBlock),
          toBlock: BigInt(toBlock),
        })
      : [];

    const sortedCredit = [...creditLogs].sort((a, b) => {
      const blockDiff = Number(a.blockNumber) - Number(b.blockNumber);
      if (blockDiff !== 0) return blockDiff;
      return Number(a.logIndex) - Number(b.logIndex);
    });

    // Clear timestamp cache for this batch
    blockTimestampCache.clear();

    // Process all events in a single transaction
    await sequelize.transaction(async (tx) => {
      // Process credit line events
      for (const log of sortedCredit) {
        const eventName = log.eventName as string;
        const handler = CREDIT_EVENT_HANDLERS[eventName];
        if (handler) {
          await handler(log as CreditLog, tx);
        } else {
          console.warn(`[indexer] Unknown credit event: ${eventName}`);
        }
      }

      // Update cursor
      await IndexerState.update(
        { last_block_number: toBlock },
        { where: { id: 1 }, transaction: tx },
      );
    });

    const totalEvents = sortedCredit.length;
    if (totalEvents > 0) {
      console.log(
        `[indexer] Processed ${totalEvents} credit events (blocks ${fromBlock}–${toBlock})`,
      );
    }

    // If there are more blocks to process, schedule immediately
    if (toBlock < latestBlock) {
      isProcessing = false;
      await processBatch();
    }
  } catch (err) {
    console.error("[indexer] Error processing batch:", err);
  } finally {
    isProcessing = false;
  }
}

// ─── Public API ─────────────────────────────────────────────────

/** ~10 minutes of Base L2 blocks (~2s per block) */
const LOOKBACK_BLOCKS = 300;

/**
 * Start the on-chain event indexer.
 * Creates a viem PublicClient and begins polling at the configured interval.
 * On every startup, resets the cursor to ~10 minutes ago to re-process recent events.
 */
export async function startIndexer(): Promise<void> {
  if (!config.creditLineContractAddress || !config.rpcUrl) {
    console.log(
      "[indexer] Skipped — no credit line contract address or RPC_URL not configured",
    );
    return;
  }

  // Use a minimal chain definition to avoid type conflicts with chain-specific
  // transaction types (e.g. Base's "deposit" type). The indexer only needs
  // getContractEvents, readContract, getBlock, getBlockNumber.
  const chain = defineChain({
    id: 8453,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });

  client = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });

  stopped = false;

  // Reset cursor to ~10 minutes ago on every startup
  try {
    const latestBlock = Number(await client.getBlockNumber());
    const startFrom = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
    await IndexerState.upsert({ id: 1, last_block_number: startFrom });
    console.log(
      `[indexer] Reset cursor to block ${startFrom} (~10 min lookback from ${latestBlock})`,
    );
  } catch (err) {
    console.warn("[indexer] Could not reset cursor:", (err as Error).message);
  }

  // Run first batch immediately
  processBatch().catch((err) =>
    console.error("[indexer] Initial batch failed:", err),
  );

  // Then poll on interval
  intervalHandle = setInterval(() => {
    processBatch().catch((err) =>
      console.error("[indexer] Polling batch failed:", err),
    );
  }, config.indexerIntervalMs);

  console.log(
    `[indexer] Started — polling every ${config.indexerIntervalMs}ms (credit line contract: ${config.creditLineContractAddress})`,
  );
}

/**
 * Stop the indexer gracefully. Clears the interval and waits for any
 * in-progress batch to complete.
 */
export function stopIndexer(): void {
  stopped = true;
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  console.log("[indexer] Stopped");
}
