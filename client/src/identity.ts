import * as fs from "node:fs";
import * as path from "node:path";
import { keccak256, toBytes } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { AgentIdentity } from "@clawback-network/protocol";

const DEFAULT_CONFIG_DIR = path.join(process.env.HOME || "~", ".clawback");

export function getConfigDir(): string {
  return process.env.CLAWBACK_CONFIG_DIR || DEFAULT_CONFIG_DIR;
}

function ensureConfigDir(configDir: string): void {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

export interface GenerateOptions {
  force?: boolean;
  seed?: string;
}

/**
 * Generate (or return existing) agent identity.
 *
 * Idempotent by default: if identity.json already exists, returns it without
 * overwriting. Pass `force: true` to regenerate.
 *
 * Supports deterministic generation via `options.seed` or the `CLAWBACK_SEED`
 * env var — same seed always produces the same identity.
 */
export function generateIdentity(
  configDir?: string,
  options?: GenerateOptions,
): AgentIdentity {
  const dir = configDir || getConfigDir();
  ensureConfigDir(dir);

  // Idempotent: return existing identity unless force is set
  if (!options?.force) {
    const existing = loadIdentity(dir);
    if (existing) return existing;
  }

  // Derive key from seed (deterministic) or generate random
  const seedString = options?.seed || process.env.CLAWBACK_SEED;
  const key = seedString
    ? keccak256(toBytes(seedString))
    : generatePrivateKey();
  const account = privateKeyToAccount(key as `0x${string}`);

  const identity: AgentIdentity = {
    version: 1,
    address: account.address,
    publicKey: key,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(dir, "identity.json"),
    JSON.stringify(identity, null, 2),
  );

  // Save the private key separately (not in identity.json)
  fs.writeFileSync(path.join(dir, "wallet-key"), key);

  return identity;
}

/**
 * Load an existing identity from the config directory.
 * Returns null if no identity exists.
 */
export function loadIdentity(configDir?: string): AgentIdentity | null {
  const dir = configDir || getConfigDir();
  const identityPath = path.join(dir, "identity.json");

  if (!fs.existsSync(identityPath)) {
    return null;
  }

  const raw = fs.readFileSync(identityPath, "utf-8");
  return JSON.parse(raw) as AgentIdentity;
}

/**
 * Load existing identity or generate a new one.
 */
export function getOrCreateIdentity(configDir?: string): AgentIdentity {
  const dir = configDir || getConfigDir();
  const existing = loadIdentity(dir);
  if (existing) return existing;
  return generateIdentity(dir);
}

/**
 * Load the wallet private key from the config directory.
 */
export function loadWalletKey(configDir?: string): string | null {
  const dir = configDir || getConfigDir();
  const keyPath = path.join(dir, "wallet-key");

  if (!fs.existsSync(keyPath)) {
    return null;
  }

  return fs.readFileSync(keyPath, "utf-8").trim();
}
