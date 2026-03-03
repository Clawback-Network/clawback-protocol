import { encodeFunctionData } from "viem";
import { DEFAULT_DIRECTORY_URL } from "@clawback-network/protocol";
import { createWalletProvider } from "../wallet/factory.js";
import { clawBackCreditLineAbi } from "../wallet/abi.js";
import {
  parseUsdc,
  aprToBps,
  approveUsdc,
  waitForTx,
} from "../wallet/helpers.js";

const getDirectoryUrl = () =>
  process.env.CLAWBACK_DIRECTORY_URL || DEFAULT_DIRECTORY_URL;

function getCreditContractAddress(): `0x${string}` {
  const addr = process.env.CREDIT_LINE_CONTRACT_ADDRESS;
  if (!addr) {
    throw new Error(
      "CREDIT_LINE_CONTRACT_ADDRESS is required. Set it to the ClawBackCreditLine contract address.",
    );
  }
  return addr as `0x${string}`;
}

// ─── Assessor Commands (on-chain) ─────────────────────────────────

/** clawback credit back <address> — back an agent with USDC */
export async function backCommand(
  borrower: string,
  options: { amount: string; apr: string },
): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getCreditContractAddress();

    const amount = parseUsdc(parseFloat(options.amount));
    const apr = aprToBps(parseFloat(options.apr));

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);

    // Approve USDC transfer
    console.log(`Approving ${options.amount} USDC...`);
    const approveTx = await approveUsdc(wallet, contractAddress, amount);
    console.log(`  Approve tx: https://basescan.org/tx/${approveTx}`);
    await waitForTx(approveTx);

    // Back agent
    console.log(
      `Backing ${borrower} with ${options.amount} USDC at ${options.apr}% APR...`,
    );
    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "backAgent",
      args: [borrower as `0x${string}`, amount, apr],
    });

    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);
    await waitForTx(txHash);
    console.log("Done.");
  } catch (err) {
    console.error(`Failed to back agent: ${(err as Error).message}`);
  }
}

/** clawback credit adjust <address> — adjust backing amount/APR */
export async function adjustBackingCommand(
  borrower: string,
  options: { amount: string; apr: string },
): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getCreditContractAddress();

    const newAmount = parseUsdc(parseFloat(options.amount));
    const newApr = aprToBps(parseFloat(options.apr));

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);

    // If increasing, approve additional USDC
    console.log(`Approving USDC (for potential increase)...`);
    const approveTx = await approveUsdc(wallet, contractAddress, newAmount);
    console.log(`  Approve tx: https://basescan.org/tx/${approveTx}`);
    await waitForTx(approveTx);

    console.log(`Adjusting backing for ${borrower}...`);
    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "adjustBacking",
      args: [borrower as `0x${string}`, newAmount, newApr],
    });

    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);
    await waitForTx(txHash);
    console.log("Done.");
  } catch (err) {
    console.error(`Failed to adjust backing: ${(err as Error).message}`);
  }
}

/** clawback credit withdraw <address> — withdraw all backing */
export async function withdrawBackingCommand(borrower: string): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getCreditContractAddress();

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);
    console.log(`Withdrawing backing from ${borrower}...`);

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "withdrawBacking",
      args: [borrower as `0x${string}`],
    });

    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);
    await waitForTx(txHash);
    console.log("Done.");
  } catch (err) {
    console.error(`Failed to withdraw backing: ${(err as Error).message}`);
  }
}

// ─── Borrower Commands (on-chain) ─────────────────────────────────

/** clawback credit draw — draw from credit line */
export async function drawCommand(options: { amount: string }): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getCreditContractAddress();

    const amount = parseUsdc(parseFloat(options.amount));

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);
    console.log(`Drawing ${options.amount} USDC from credit line...`);

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "draw",
      args: [amount],
    });

    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);
    await waitForTx(txHash);
    console.log("Done.");
  } catch (err) {
    console.error(`Failed to draw: ${(err as Error).message}`);
  }
}

/** clawback credit repay — repay credit line */
export async function creditRepayCommand(options: {
  amount: string;
}): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getCreditContractAddress();

    const amount = parseUsdc(parseFloat(options.amount));

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);

    // Approve USDC
    console.log(`Approving ${options.amount} USDC...`);
    const approveTx = await approveUsdc(wallet, contractAddress, amount);
    console.log(`  Approve tx: https://basescan.org/tx/${approveTx}`);
    await waitForTx(approveTx);

    console.log(`Repaying ${options.amount} USDC...`);
    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "repay",
      args: [amount],
    });

    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);
    await waitForTx(txHash);
    console.log("Done.");
  } catch (err) {
    console.error(`Failed to repay: ${(err as Error).message}`);
  }
}

/** clawback credit register-agent — register ERC-8004 agent ID */
export async function registerAgentIdCommand(options: {
  agentId: string;
}): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const contractAddress = getCreditContractAddress();

    const agentId = BigInt(parseInt(options.agentId, 10));

    const address = await wallet.getAddress();
    console.log(`Wallet: ${address}`);
    console.log(`Registering ERC-8004 agent ID: ${options.agentId}...`);

    const data = encodeFunctionData({
      abi: clawBackCreditLineAbi,
      functionName: "registerAgentId",
      args: [agentId],
    });

    const txHash = await wallet.sendTransaction({ to: contractAddress, data });
    console.log(`  Tx: https://basescan.org/tx/${txHash}`);
    await waitForTx(txHash);
    console.log("Done.");
  } catch (err) {
    console.error(`Failed to register agent ID: ${(err as Error).message}`);
  }
}

// ─── Read Commands (directory API) ────────────────────────────────

interface CreditLineResponse {
  borrower_addr: string;
  total_backing: number;
  total_drawn: number;
  total_repaid: number;
  total_interest_paid: number;
  blended_apr: number;
  status: string;
  backer_count: number;
  agent_id?: number;
  backings?: Array<{
    assessor_addr: string;
    max_amount: number;
    apr: number;
    drawn_amount: number;
    earned_interest: number;
    active: boolean;
  }>;
}

/** clawback credit line <address> — view credit line details */
export async function creditLineCommand(address: string): Promise<void> {
  try {
    const directoryUrl = getDirectoryUrl();
    const res = await fetch(`${directoryUrl}/credit/lines/${address}`);

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`No credit line found for ${address}`);
      } else {
        console.error(`Request failed: ${res.status} ${res.statusText}`);
      }
      return;
    }

    const cl = (await res.json()) as CreditLineResponse;

    console.log(`=== Credit Line: ${cl.borrower_addr} ===\n`);
    console.log(`  Total Backing:   ${cl.total_backing} USDC`);
    console.log(`  Total Drawn:     ${cl.total_drawn} USDC`);
    console.log(`  Available:       ${cl.total_backing - cl.total_drawn} USDC`);
    console.log(`  Blended APR:     ${cl.blended_apr?.toFixed(2)}%`);
    console.log(`  Total Repaid:    ${cl.total_repaid} USDC`);
    console.log(`  Interest Paid:   ${cl.total_interest_paid} USDC`);
    console.log(`  Status:          ${cl.status}`);
    console.log(`  Backers:         ${cl.backer_count}`);
    if (cl.agent_id) console.log(`  ERC-8004 ID:     ${cl.agent_id}`);

    if (cl.backings?.length) {
      console.log(`\n  Backers:`);
      for (const b of cl.backings) {
        console.log(
          `    ${b.assessor_addr.slice(0, 10)}... — ${b.max_amount} USDC @ ${b.apr}% APR (drawn: ${b.drawn_amount}, earned: ${b.earned_interest})`,
        );
      }
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

interface BackingsResponse {
  assessor: string;
  backings: Array<{
    borrower_addr: string;
    max_amount: number;
    apr: number;
    drawn_amount: number;
    earned_interest: number;
  }>;
  total_backed: number;
  total_exposure: number;
  agents_backed: number;
}

/** clawback credit my-backings — view your backing positions */
export async function myBackingsCommand(): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const address = await wallet.getAddress();
    const directoryUrl = getDirectoryUrl();

    const res = await fetch(`${directoryUrl}/credit/backers/${address}`);
    if (!res.ok) {
      console.error(`Request failed: ${res.status} ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as BackingsResponse;

    console.log(`=== Your Backing Positions ===\n`);
    console.log(`  Total Backed:   ${data.total_backed} USDC`);
    console.log(`  Total Exposure: ${data.total_exposure} USDC`);
    console.log(`  Agents Backed:  ${data.agents_backed}\n`);

    if (data.backings.length === 0) {
      console.log("  No active backings.");
      return;
    }

    for (const b of data.backings) {
      console.log(
        `  ${b.borrower_addr.slice(0, 10)}... — ${b.max_amount} USDC @ ${b.apr}% (drawn: ${b.drawn_amount}, earned: ${b.earned_interest})`,
      );
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit my-line — view your credit line */
export async function myCreditCommand(): Promise<void> {
  try {
    const wallet = createWalletProvider();
    const address = await wallet.getAddress();
    await creditLineCommand(address);
  } catch (err) {
    console.error(`Failed: ${(err as Error).message}`);
  }
}
