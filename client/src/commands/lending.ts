import { encodeFunctionData } from "viem";
import { DEFAULT_DIRECTORY_URL } from "@clawback-network/protocol";
import { createWalletProvider } from "../wallet/factory.js";
import { clawBackLendingWriteAbi } from "../wallet/abi.js";
import {
  parseUsdc,
  aprToBps,
  generateLoanId,
  approveUsdc,
  waitForTx,
} from "../wallet/helpers.js";

const getDirectoryUrl = () =>
  process.env.CLAWBACK_DIRECTORY_URL || DEFAULT_DIRECTORY_URL;

function getContractAddress(): `0x${string}` {
  const addr = process.env.CONTRACT_ADDRESS;
  if (!addr) {
    throw new Error(
      "CONTRACT_ADDRESS is required. Set it to the ClawBackLending contract address.",
    );
  }
  return addr as `0x${string}`;
}

// ─── Write Commands (on-chain transactions) ────────────────────────

/** clawback request — create a loan on-chain */
export async function requestCommand(options: {
  amount: string;
  duration: string;
  purpose: string;
  minFunding?: string;
  deadline?: string;
  collateral?: string;
}): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getContractAddress();

    const amount = parseUsdc(parseFloat(options.amount));
    const minFunding = options.minFunding
      ? parseUsdc(parseFloat(options.minFunding))
      : amount;
    const collateral = options.collateral
      ? parseUsdc(parseFloat(options.collateral))
      : 0n;
    const durationDays = BigInt(parseInt(options.duration, 10));
    const deadlineHours = BigInt(parseInt(options.deadline || "48", 10));
    const loanId = generateLoanId();

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);

    // Approve collateral transfer if needed
    if (collateral > 0n) {
      console.log(`Approving ${options.collateral} USDC collateral...`);
      const approveTx = await approveUsdc(wallet, contractAddress, collateral);
      console.log(`  Approve tx: https://basescan.org/tx/${approveTx}`);
      await waitForTx(approveTx);
      console.log("  Approved.");
    }

    // Encode and send createLoan transaction
    const data = encodeFunctionData({
      abi: clawBackLendingWriteAbi,
      functionName: "createLoan",
      args: [
        loanId,
        amount,
        minFunding,
        collateral,
        durationDays,
        deadlineHours,
      ],
    });

    console.log("Submitting loan request...");
    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);

    const receipt = await waitForTx(txHash);
    if (receipt.status === "success") {
      console.log(`\nLoan request created successfully!`);
      console.log(`  Loan ID:    ${loanId}`);
      console.log(`  Amount:     ${options.amount} USDC`);
      console.log(`  Duration:   ${options.duration} days`);
      console.log(`  Collateral: ${options.collateral || "0"} USDC`);
      console.log(`  Deadline:   ${options.deadline || "48"} hours`);
      console.log(`  Purpose:    ${options.purpose}`);
    } else {
      console.error("Transaction reverted.");
    }
  } catch (err) {
    console.error(`Failed: ${(err as Error).message}`);
  }
}

/** clawback assess — stake on a loan on-chain */
export async function assessCommand(
  loanId: string,
  options: { stake: string; apr: string; rationale?: string },
): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getContractAddress();

    const stakeAmount = parseUsdc(parseFloat(options.stake));
    const aprBps = aprToBps(parseFloat(options.apr));
    const loanIdBytes = loanId as `0x${string}`;

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);

    // Approve stake transfer
    console.log(`Approving ${options.stake} USDC stake...`);
    const approveTx = await approveUsdc(wallet, contractAddress, stakeAmount);
    console.log(`  Approve tx: https://basescan.org/tx/${approveTx}`);
    await waitForTx(approveTx);
    console.log("  Approved.");

    // Encode and send assess transaction
    const data = encodeFunctionData({
      abi: clawBackLendingWriteAbi,
      functionName: "assess",
      args: [loanIdBytes, stakeAmount, aprBps],
    });

    console.log("Submitting assessment...");
    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);

    const receipt = await waitForTx(txHash);
    if (receipt.status === "success") {
      console.log(`\nAssessment submitted successfully!`);
      console.log(`  Loan:  ${loanId}`);
      console.log(`  Stake: ${options.stake} USDC`);
      console.log(`  APR:   ${options.apr}%`);
    } else {
      console.error("Transaction reverted.");
    }
  } catch (err) {
    console.error(`Failed: ${(err as Error).message}`);
  }
}

/** clawback withdraw — withdraw assessment on-chain */
export async function withdrawCommand(loanId: string): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getContractAddress();
    const loanIdBytes = loanId as `0x${string}`;

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);

    const data = encodeFunctionData({
      abi: clawBackLendingWriteAbi,
      functionName: "withdrawAssessment",
      args: [loanIdBytes],
    });

    console.log("Withdrawing assessment...");
    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);

    const receipt = await waitForTx(txHash);
    if (receipt.status === "success") {
      console.log(`\nAssessment withdrawn for loan: ${loanId}`);
    } else {
      console.error("Transaction reverted.");
    }
  } catch (err) {
    console.error(`Failed: ${(err as Error).message}`);
  }
}

/** clawback repay — repay a loan on-chain */
export async function repayCommand(
  loanId: string,
  options: { amount: string },
): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getContractAddress();

    const amount = parseUsdc(parseFloat(options.amount));
    const loanIdBytes = loanId as `0x${string}`;

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);

    // Approve repayment transfer
    console.log(`Approving ${options.amount} USDC repayment...`);
    const approveTx = await approveUsdc(wallet, contractAddress, amount);
    console.log(`  Approve tx: https://basescan.org/tx/${approveTx}`);
    await waitForTx(approveTx);
    console.log("  Approved.");

    const data = encodeFunctionData({
      abi: clawBackLendingWriteAbi,
      functionName: "repay",
      args: [loanIdBytes, amount],
    });

    console.log("Submitting repayment...");
    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);

    const receipt = await waitForTx(txHash);
    if (receipt.status === "success") {
      console.log(`\nRepayment submitted for loan: ${loanId}`);
      console.log(`  Amount: ${options.amount} USDC`);
    } else {
      console.error("Transaction reverted.");
    }
  } catch (err) {
    console.error(`Failed: ${(err as Error).message}`);
  }
}

// ─── Read Commands (unchanged — query directory API) ───────────────

/** clawback loans — list loans */
export async function loansCommand(options: {
  status?: string;
}): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);

  try {
    const res = await fetch(
      `${directoryUrl}/lending/loans?${params.toString()}`,
    );

    if (!res.ok) {
      console.error(`Failed: ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as {
      loans: Array<{
        id: string;
        borrower_addr: string;
        amount_requested: number;
        status: string;
        total_funded: number;
        created_at: string;
      }>;
    };

    if (data.loans.length === 0) {
      console.log("No loans found.");
      return;
    }

    console.log(`Found ${data.loans.length} loan(s):\n`);
    for (const loan of data.loans) {
      console.log(`  ${loan.id} [${loan.status}]`);
      console.log(`    Borrower: ${loan.borrower_addr}`);
      console.log(
        `    Amount: ${loan.amount_requested} USDC (funded: ${loan.total_funded})`,
      );
      console.log(`    Created: ${loan.created_at}`);
      console.log();
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback loan — get single loan detail */
export async function loanCommand(loanId: string): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  try {
    const res = await fetch(`${directoryUrl}/lending/loans/${loanId}`);

    if (!res.ok) {
      if (res.status === 404) {
        console.error(`Loan not found: ${loanId}`);
      } else {
        console.error(`Failed: ${res.statusText}`);
      }
      return;
    }

    const loan = (await res.json()) as {
      id: string;
      borrower_addr: string;
      amount_requested: number;
      min_funding_amount: number;
      funding_deadline: string;
      collateral_amount: number;
      duration_days: number;
      purpose: string;
      status: string;
      total_funded: number;
      assessments: Array<{
        assessor_addr: string;
        stake_amount: number;
        apr: number;
        decision: string;
      }>;
      created_at: string;
    };

    console.log(`=== Loan: ${loan.id} ===\n`);
    console.log(`  Status:       ${loan.status}`);
    console.log(`  Borrower:     ${loan.borrower_addr}`);
    console.log(`  Amount:       ${loan.amount_requested} USDC`);
    console.log(`  Min funding:  ${loan.min_funding_amount} USDC`);
    console.log(`  Funded:       ${loan.total_funded} USDC`);
    console.log(`  Collateral:   ${loan.collateral_amount} USDC`);
    console.log(`  Duration:     ${loan.duration_days} days`);
    console.log(`  Deadline:     ${loan.funding_deadline}`);
    console.log(`  Purpose:      ${loan.purpose}`);
    console.log(`  Created:      ${loan.created_at}`);

    if (loan.assessments?.length > 0) {
      console.log(`\n  Assessments (${loan.assessments.length}):`);
      for (const a of loan.assessments) {
        console.log(
          `    ${a.assessor_addr}: ${a.stake_amount} USDC @ ${a.apr}% APR [${a.decision}]`,
        );
      }
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback notifications — query notifications feed */
export async function notificationsCommand(options: {
  since?: string;
  types?: string;
  limit?: string;
}): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  const params = new URLSearchParams();
  if (options.since) params.set("since", options.since);
  if (options.types) params.set("types", options.types);
  if (options.limit) params.set("limit", options.limit);

  try {
    const res = await fetch(
      `${directoryUrl}/lending/notifications?${params.toString()}`,
    );

    if (!res.ok) {
      console.error(`Failed: ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as {
      notifications: Array<{
        id: string;
        type: string;
        loan_id: string;
        agent_addr: string;
        data: Record<string, unknown>;
        timestamp: string;
      }>;
    };

    if (data.notifications.length === 0) {
      console.log("No notifications.");
      return;
    }

    console.log(`${data.notifications.length} notification(s):\n`);
    for (const n of data.notifications) {
      const date = new Date(n.timestamp)
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");
      console.log(`  [${date}] ${n.type} — loan ${n.loan_id}`);
      if (Object.keys(n.data).length > 0) {
        console.log(`    ${JSON.stringify(n.data)}`);
      }
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}
