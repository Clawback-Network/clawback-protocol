import type { WalletProvider } from "./types.js";

/**
 * Bankr wallet provider — gas-free, auto-wallet, zero key management.
 *
 * Uses raw `fetch` to POST /agent/submit for on-chain transactions,
 * preserving msg.sender (critical for loan ownership).
 * Wallet address resolved from GET /agent/me on first call, cached.
 */
export class BankrWalletProvider implements WalletProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private cachedAddress: `0x${string}` | null = null;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.bankr.bot";
  }

  async getAddress(): Promise<`0x${string}`> {
    if (this.cachedAddress) return this.cachedAddress;

    const res = await fetch(`${this.baseUrl}/agent/me`, {
      headers: { "X-API-Key": this.apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bankr /agent/me failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { address: string };
    this.cachedAddress = data.address.toLowerCase() as `0x${string}`;
    return this.cachedAddress;
  }

  async sendTransaction(tx: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }): Promise<`0x${string}`> {
    const body: Record<string, unknown> = {
      to: tx.to,
      data: tx.data,
    };

    if (tx.value !== undefined && tx.value > 0n) {
      body.value = `0x${tx.value.toString(16)}`;
    }

    const res = await fetch(`${this.baseUrl}/agent/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bankr /agent/submit failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { hash: string };
    return data.hash as `0x${string}`;
  }
}
