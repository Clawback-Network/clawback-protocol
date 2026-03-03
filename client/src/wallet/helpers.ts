import {
  createPublicClient,
  encodeFunctionData,
  http,
  type TransactionReceipt,
} from "viem";
import { base } from "viem/chains";
import type { WalletProvider } from "./types.js";
import { erc20Abi, BASE_USDC_ADDRESS } from "./abi.js";

const USDC_DECIMALS = 6;
const BPS_DIVISOR = 100; // 10.5% → 1050 bps

/** Convert human-readable USDC amount to raw 6-decimal bigint. */
export function parseUsdc(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

/** Convert APR percentage to basis points (10.5% → 1050n). */
export function aprToBps(apr: number): bigint {
  return BigInt(Math.round(apr * BPS_DIVISOR));
}

/** Generate a random bytes32 loan ID. */
export function generateLoanId(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}` as `0x${string}`;
}

/** Encode + send an ERC-20 approve transaction. */
export async function approveUsdc(
  wallet: WalletProvider,
  spender: `0x${string}`,
  amount: bigint,
): Promise<`0x${string}`> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });

  return wallet.sendTransaction({ to: BASE_USDC_ADDRESS, data });
}

/** Wait for a transaction receipt using a public client. */
export async function waitForTx(
  txHash: `0x${string}`,
  rpcUrl?: string,
): Promise<TransactionReceipt> {
  const client = createPublicClient({
    chain: base,
    transport: http(
      rpcUrl || process.env.RPC_URL || "https://mainnet.base.org",
    ),
  });

  return client.waitForTransactionReceipt({ hash: txHash });
}
