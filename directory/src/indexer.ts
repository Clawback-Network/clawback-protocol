import type { Transaction } from "sequelize";
import { createPublicClient, defineChain, http, type Log } from "viem";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { clawBackLendingAbi, clawBackCreditLineAbi } from "./contractAbi.js";
import { Loan } from "./models/Loan.js";
import { LoanAssessment } from "./models/LoanAssessment.js";
import { IndexerState } from "./models/IndexerState.js";
import {
  AgentLendingMetrics,
  type AgentLendingMetricsAttributes,
} from "./models/AgentLendingMetrics.js";
import { Notification } from "./models/Notification.js";
import { CreditLineModel } from "./models/CreditLine.js";
import { CreditBacking } from "./models/CreditBacking.js";

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

/** Contract status enum index → DB string. */
const _STATUS_MAP: Record<number, string> = {
  0: "funding",
  1: "active",
  2: "completed",
  3: "defaulted",
  4: "cancelled",
};

/**
 * Find-or-create an AgentLendingMetrics row and increment a numeric field.
 * Uses a Sequelize transaction for safety.
 */
async function incrementMetric(
  address: string,
  field: keyof AgentLendingMetricsAttributes,
  delta: number,
  tx: Transaction,
): Promise<void> {
  const addr = address.toLowerCase();
  const [metrics] = await AgentLendingMetrics.findOrCreate({
    where: { agent_address: addr },
    defaults: {
      agent_address: addr,
    } as AgentLendingMetricsAttributes,
    transaction: tx,
  });
  await metrics.increment(field, { by: delta, transaction: tx });
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

// ─── Event Handlers ─────────────────────────────────────────────

type ContractLog = Log<
  bigint,
  number,
  false,
  undefined,
  true,
  typeof clawBackLendingAbi
>;

async function handleLoanCreated(
  log: ContractLog,
  tx: Transaction,
): Promise<void> {
  const { loanId, borrower, amount, collateral } = log.args as {
    loanId: `0x${string}`;
    borrower: `0x${string}`;
    amount: bigint;
    collateral: bigint;
  };
  const blockNum = Number(log.blockNumber);

  // Read full loan data from contract (includes minFundingAmount, durationDays, etc.)
  const loanData = await client.readContract({
    address: config.contractAddress as `0x${string}`,
    abi: clawBackLendingAbi,
    functionName: "getLoan",
    args: [loanId],
  });

  const blockTs = await getBlockTimestamp(blockNum);

  await Loan.findOrCreate({
    where: { loan_id: loanId },
    defaults: {
      loan_id: loanId,
      borrower_addr: borrower.toLowerCase(),
      amount_requested: toUsdc(amount),
      min_funding_amount: toUsdc(loanData.minFundingAmount),
      total_funded: 0,
      total_repaid: 0,
      collateral_amount: toUsdc(collateral),
      funding_deadline: new Date(Number(loanData.fundingDeadline) * 1000),
      activated_at: null,
      duration_days: Number(loanData.durationDays),
      status: "funding",
      block_number: blockNum,
    },
    transaction: tx,
  });

  await incrementMetric(borrower, "loans_requested", 1, tx);
  await incrementMetric(borrower, "total_borrowed", toUsdc(amount), tx);

  await Notification.create(
    {
      type: "loan_created",
      loan_id: loanId,
      agent_addr: borrower.toLowerCase(),
      data: {
        amount: toUsdc(amount),
        collateral: toUsdc(collateral),
        block_number: blockNum,
        timestamp: blockTs.toISOString(),
      },
    },
    { transaction: tx },
  );
}

async function handleLoanAssessed(
  log: ContractLog,
  tx: Transaction,
): Promise<void> {
  const { loanId, assessor, stake, apr } = log.args as {
    loanId: `0x${string}`;
    assessor: `0x${string}`;
    stake: bigint;
    apr: bigint;
  };
  const blockNum = Number(log.blockNumber);
  const blockTs = await getBlockTimestamp(blockNum);
  const stakeUsdc = toUsdc(stake);

  await LoanAssessment.findOrCreate({
    where: { loan_id: loanId, assessor_addr: assessor.toLowerCase() },
    defaults: {
      loan_id: loanId,
      assessor_addr: assessor.toLowerCase(),
      stake_amount: stakeUsdc,
      apr: bpsToPercent(apr),
      block_number: blockNum,
      withdrawn_at: null,
    },
    transaction: tx,
  });

  // Update loan total_funded
  await Loan.increment("total_funded", {
    by: stakeUsdc,
    where: { loan_id: loanId },
    transaction: tx,
  });

  await incrementMetric(assessor, "assessments_made", 1, tx);
  await incrementMetric(assessor, "total_staked", stakeUsdc, tx);

  await Notification.create(
    {
      type: "assessment_received",
      loan_id: loanId,
      agent_addr: assessor.toLowerCase(),
      data: {
        stake: stakeUsdc,
        apr: bpsToPercent(apr),
        block_number: blockNum,
        timestamp: blockTs.toISOString(),
      },
    },
    { transaction: tx },
  );
}

async function handleAssessmentWithdrawn(
  log: ContractLog,
  tx: Transaction,
): Promise<void> {
  const { loanId, assessor, stake } = log.args as {
    loanId: `0x${string}`;
    assessor: `0x${string}`;
    stake: bigint;
  };
  const blockNum = Number(log.blockNumber);
  const blockTs = await getBlockTimestamp(blockNum);
  const stakeUsdc = toUsdc(stake);

  // Mark assessment as withdrawn
  await LoanAssessment.update(
    { withdrawn_at: blockTs },
    {
      where: { loan_id: loanId, assessor_addr: assessor.toLowerCase() },
      transaction: tx,
    },
  );

  // Decrement loan total_funded
  await Loan.decrement("total_funded", {
    by: stakeUsdc,
    where: { loan_id: loanId },
    transaction: tx,
  });

  await incrementMetric(assessor, "assessments_made", -1, tx);
  await incrementMetric(assessor, "total_staked", -stakeUsdc, tx);

  await Notification.create(
    {
      type: "assessment_withdrawn",
      loan_id: loanId,
      agent_addr: assessor.toLowerCase(),
      data: {
        stake: stakeUsdc,
        block_number: blockNum,
        timestamp: blockTs.toISOString(),
      },
    },
    { transaction: tx },
  );
}

async function handleLoanActivated(
  log: ContractLog,
  tx: Transaction,
): Promise<void> {
  const { loanId, totalFunded } = log.args as {
    loanId: `0x${string}`;
    totalFunded: bigint;
    activatedBy: `0x${string}`;
  };
  const blockNum = Number(log.blockNumber);
  const blockTs = await getBlockTimestamp(blockNum);

  await Loan.update(
    {
      status: "active",
      activated_at: blockTs,
      total_funded: toUsdc(totalFunded),
    },
    { where: { loan_id: loanId }, transaction: tx },
  );

  const loan = await Loan.findByPk(loanId, { transaction: tx });

  await Notification.create(
    {
      type: "loan_activated",
      loan_id: loanId,
      agent_addr: loan?.borrower_addr ?? "",
      data: {
        total_funded: toUsdc(totalFunded),
        block_number: blockNum,
        timestamp: blockTs.toISOString(),
      },
    },
    { transaction: tx },
  );
}

async function handleRepaymentMade(
  log: ContractLog,
  tx: Transaction,
): Promise<void> {
  const { loanId, borrower, amount } = log.args as {
    loanId: `0x${string}`;
    borrower: `0x${string}`;
    amount: bigint;
  };
  const blockNum = Number(log.blockNumber);
  const blockTs = await getBlockTimestamp(blockNum);
  const amountUsdc = toUsdc(amount);

  await Loan.increment("total_repaid", {
    by: amountUsdc,
    where: { loan_id: loanId },
    transaction: tx,
  });

  await incrementMetric(borrower, "total_repaid", amountUsdc, tx);

  await Notification.create(
    {
      type: "repayment_received",
      loan_id: loanId,
      agent_addr: borrower.toLowerCase(),
      data: {
        amount: amountUsdc,
        block_number: blockNum,
        timestamp: blockTs.toISOString(),
      },
    },
    { transaction: tx },
  );
}

async function handleLoanRepaid(
  log: ContractLog,
  tx: Transaction,
): Promise<void> {
  const { loanId } = log.args as { loanId: `0x${string}` };
  const blockNum = Number(log.blockNumber);
  const blockTs = await getBlockTimestamp(blockNum);

  await Loan.update(
    { status: "completed" },
    { where: { loan_id: loanId }, transaction: tx },
  );

  const loan = await Loan.findByPk(loanId, { transaction: tx });
  if (loan) {
    await incrementMetric(loan.borrower_addr, "loans_completed", 1, tx);
  }

  await Notification.create(
    {
      type: "loan_completed",
      loan_id: loanId,
      agent_addr: loan?.borrower_addr ?? "",
      data: {
        block_number: blockNum,
        timestamp: blockTs.toISOString(),
      },
    },
    { transaction: tx },
  );
}

async function handleLoanDefaulted(
  log: ContractLog,
  tx: Transaction,
): Promise<void> {
  const { loanId, collateralDistributed } = log.args as {
    loanId: `0x${string}`;
    collateralDistributed: bigint;
  };
  const blockNum = Number(log.blockNumber);
  const blockTs = await getBlockTimestamp(blockNum);

  await Loan.update(
    { status: "defaulted" },
    { where: { loan_id: loanId }, transaction: tx },
  );

  const loan = await Loan.findByPk(loanId, { transaction: tx });
  if (loan) {
    await incrementMetric(loan.borrower_addr, "loans_defaulted", 1, tx);
  }

  // Each assessor loses their stake
  const assessments = await LoanAssessment.findAll({
    where: { loan_id: loanId, withdrawn_at: null },
    transaction: tx,
  });
  for (const a of assessments) {
    await incrementMetric(a.assessor_addr, "total_lost", a.stake_amount, tx);
  }

  await Notification.create(
    {
      type: "loan_defaulted",
      loan_id: loanId,
      agent_addr: loan?.borrower_addr ?? "",
      data: {
        collateral_distributed: toUsdc(collateralDistributed),
        block_number: blockNum,
        timestamp: blockTs.toISOString(),
      },
    },
    { transaction: tx },
  );
}

async function handleLoanCancelled(
  log: ContractLog,
  tx: Transaction,
): Promise<void> {
  const { loanId } = log.args as { loanId: `0x${string}` };
  const blockNum = Number(log.blockNumber);
  const blockTs = await getBlockTimestamp(blockNum);

  await Loan.update(
    { status: "cancelled" },
    { where: { loan_id: loanId }, transaction: tx },
  );

  const loan = await Loan.findByPk(loanId, { transaction: tx });

  await Notification.create(
    {
      type: "loan_cancelled",
      loan_id: loanId,
      agent_addr: loan?.borrower_addr ?? "",
      data: {
        block_number: blockNum,
        timestamp: blockTs.toISOString(),
      },
    },
    { transaction: tx },
  );
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
      agent_id: null,
      block_number: blockNum,
    },
    transaction: tx,
  });

  await creditLine.increment("total_backing", {
    by: amountUsdc,
    transaction: tx,
  });
  await creditLine.increment("backer_count", { by: 1, transaction: tx });
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
  }
}

async function handleCreditDrawn(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { borrower, newOutstanding } = log.args as {
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
}

async function handleCreditLineDefaulted(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { borrower } = log.args as {
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
}

async function handleAgentIdRegistered(
  log: CreditLog,
  tx: Transaction,
): Promise<void> {
  const { agent, agentId } = log.args as {
    agent: `0x${string}`;
    agentId: bigint;
  };

  await CreditLineModel.update(
    { agent_id: Number(agentId) },
    {
      where: { borrower_addr: agent.toLowerCase() },
      transaction: tx,
    },
  );
}

// ─── Event Dispatch ─────────────────────────────────────────────

const EVENT_HANDLERS: Record<
  string,
  (log: ContractLog, tx: Transaction) => Promise<void>
> = {
  LoanCreated: handleLoanCreated,
  LoanAssessed: handleLoanAssessed,
  AssessmentWithdrawn: handleAssessmentWithdrawn,
  LoanActivated: handleLoanActivated,
  RepaymentMade: handleRepaymentMade,
  LoanRepaid: handleLoanRepaid,
  LoanDefaulted: handleLoanDefaulted,
  LoanCancelled: handleLoanCancelled,
};

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
  AgentIdRegistered: handleAgentIdRegistered,
};

// ─── Core Polling Loop ──────────────────────────────────────────

async function processBatch(): Promise<void> {
  if (isProcessing || stopped) return;
  isProcessing = true;

  try {
    // Get or create cursor
    const [state] = await IndexerState.findOrCreate({
      where: { id: 1 },
      defaults: {
        id: 1,
        last_block_number: config.indexerStartBlock,
      },
    });

    const fromBlock = state.last_block_number + 1;
    const latestBlock = Number(await client.getBlockNumber());

    if (fromBlock > latestBlock) {
      return; // nothing new
    }

    const toBlock = Math.min(
      fromBlock + config.indexerBatchSize - 1,
      latestBlock,
    );

    // Fetch lending contract events
    const lendingLogs = config.contractAddress
      ? await client.getContractEvents({
          address: config.contractAddress as `0x${string}`,
          abi: clawBackLendingAbi,
          fromBlock: BigInt(fromBlock),
          toBlock: BigInt(toBlock),
        })
      : [];

    // Fetch credit line contract events
    const creditLogs = config.creditLineContractAddress
      ? await client.getContractEvents({
          address: config.creditLineContractAddress as `0x${string}`,
          abi: clawBackCreditLineAbi,
          fromBlock: BigInt(fromBlock),
          toBlock: BigInt(toBlock),
        })
      : [];

    // Sort all logs deterministically by (blockNumber, logIndex)
    const sortedLending = [...lendingLogs].sort((a, b) => {
      const blockDiff = Number(a.blockNumber) - Number(b.blockNumber);
      if (blockDiff !== 0) return blockDiff;
      return Number(a.logIndex) - Number(b.logIndex);
    });

    const sortedCredit = [...creditLogs].sort((a, b) => {
      const blockDiff = Number(a.blockNumber) - Number(b.blockNumber);
      if (blockDiff !== 0) return blockDiff;
      return Number(a.logIndex) - Number(b.logIndex);
    });

    // Clear timestamp cache for this batch
    blockTimestampCache.clear();

    // Process all events in a single transaction
    await sequelize.transaction(async (tx) => {
      // Process lending events
      for (const log of sortedLending) {
        const eventName = log.eventName as string;
        const handler = EVENT_HANDLERS[eventName];
        if (handler) {
          await handler(log as ContractLog, tx);
        } else {
          console.warn(`[indexer] Unknown lending event: ${eventName}`);
        }
      }

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

    const totalEvents = sortedLending.length + sortedCredit.length;
    if (totalEvents > 0) {
      console.log(
        `[indexer] Processed ${totalEvents} events (blocks ${fromBlock}–${toBlock}): ${sortedLending.length} lending, ${sortedCredit.length} credit`,
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

/**
 * Start the on-chain event indexer.
 * Creates a viem PublicClient and begins polling at the configured interval.
 */
export function startIndexer(): void {
  if (
    (!config.contractAddress && !config.creditLineContractAddress) ||
    !config.rpcUrl
  ) {
    console.log(
      "[indexer] Skipped — no contract addresses or RPC_URL not configured",
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
    `[indexer] Started — polling every ${config.indexerIntervalMs}ms (contract: ${config.contractAddress})`,
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
