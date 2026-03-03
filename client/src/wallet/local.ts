import { createWalletClient, http } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { base } from "viem/chains";
import type { WalletProvider } from "./types.js";

/**
 * Local wallet provider — uses ~/.clawback/wallet-key + viem WalletClient.
 * Requires the user to fund the wallet with ETH (gas) + USDC.
 */
export class LocalWalletProvider implements WalletProvider {
  private readonly account: PrivateKeyAccount;
  private readonly rpcUrl: string;

  constructor(privateKey: string, rpcUrl: string) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.rpcUrl = rpcUrl;
  }

  async getAddress(): Promise<`0x${string}`> {
    return this.account.address;
  }

  async sendTransaction(tx: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }): Promise<`0x${string}`> {
    const client = createWalletClient({
      account: this.account,
      chain: base,
      transport: http(this.rpcUrl),
    });

    return client.sendTransaction({
      account: this.account,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      chain: base,
    });
  }
}
