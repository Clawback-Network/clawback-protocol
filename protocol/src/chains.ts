/** Chain configuration registry for supported L2 networks. */

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  usdcAddress: `0x${string}`;
  explorerUrl: string;
}

const CHAINS: Record<number, ChainConfig> = {
  8453: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    explorerUrl: "https://basescan.org",
  },
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerUrl: "https://sepolia.basescan.org",
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);

export function getChainConfig(chainId: number): ChainConfig {
  const config = CHAINS[chainId];
  if (!config) {
    throw new Error(
      `Unsupported chain ID: ${chainId}. Supported: ${SUPPORTED_CHAIN_IDS.join(", ")}`,
    );
  }
  return config;
}

/** Default chain ID (Base mainnet). */
export const DEFAULT_CHAIN_ID = 8453;
