import * as fs from "node:fs";
import * as path from "node:path";
import type { WalletProvider } from "./types.js";
import { BankrWalletProvider } from "./bankr.js";
import { LocalWalletProvider } from "./local.js";
import { getConfigDir } from "../identity.js";
import { loadConfig } from "../config.js";

/**
 * Create a WalletProvider based on config + environment.
 *
 * Selection priority:
 * 1. WALLET_PROVIDER env var (override everything)
 * 2. ~/.clawback/config.json → walletProvider field
 * 3. If BANKR_API_KEY is set → bankr
 * 4. If ~/.clawback/wallet-key exists → local
 * 5. Error
 */
export function createWalletProvider(): WalletProvider {
  const configDir = getConfigDir();
  const config = loadConfig(configDir);

  // Determine provider type
  let provider: string | undefined =
    process.env.WALLET_PROVIDER || config.walletProvider;

  if (!provider) {
    if (process.env.BANKR_API_KEY) {
      provider = "bankr";
    } else if (fs.existsSync(path.join(configDir, "wallet-key"))) {
      provider = "local";
    }
  }

  if (!provider) {
    throw new Error(
      "No wallet configured. Set BANKR_API_KEY or run `clawback identity -g` and `clawback config set walletProvider local`.",
    );
  }

  if (provider === "bankr") {
    const apiKey = process.env.BANKR_API_KEY;
    if (!apiKey) {
      throw new Error(
        "BANKR_API_KEY is required for bankr wallet provider. Get one at bankr.bot/api.",
      );
    }
    return new BankrWalletProvider(apiKey, process.env.BANKR_API_URL);
  }

  if (provider === "local") {
    const keyPath = path.join(configDir, "wallet-key");
    if (!fs.existsSync(keyPath)) {
      throw new Error("No wallet-key found. Run `clawback identity -g` first.");
    }
    const privateKey = fs.readFileSync(keyPath, "utf-8").trim();
    const rpcUrl = process.env.RPC_URL || "https://mainnet.base.org";
    return new LocalWalletProvider(privateKey, rpcUrl);
  }

  throw new Error(
    `Unknown wallet provider "${provider}". Use "bankr" or "local".`,
  );
}
