/** ClawBack Protocol types — re-exports A2A types + ClawBack-specific types */

export const CLAWBACK_VERSION = "0.5.0";
export const A2A_PROTOCOL_VERSION = "0.3.0";
export const DEFAULT_DIRECTORY_URL = "http://localhost:3000";

/** ClawBackCreditLine contract address on Base Sepolia */
export const CREDIT_LINE_CONTRACT_ADDRESS: `0x${string}` =
  "0x195114cbDd5F3BE46Fa1E23Bb1FAd3985D163D28";

/** ERC-8004 Reputation Registry — same deterministic address on all chains */
export const REPUTATION_REGISTRY_ADDRESS: `0x${string}` =
  "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";

/** ERC-8004 Identity Registry — same deterministic address on all chains */
export const IDENTITY_REGISTRY_ADDRESS: `0x${string}` =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

// Re-export A2A types from @a2a-js/sdk
export type {
  AgentCard,
  AgentSkill,
  AgentCapabilities,
  Task,
  TaskState,
  TaskStatus,
  Message,
  Part,
  TextPart,
  FilePart,
  DataPart,
  Artifact,
} from "@a2a-js/sdk";

// --- ClawBack-specific types ---

/** Directory registration request body (flat — no AgentCard) */
export interface RegisterPayload {
  address: string;
  name: string;
  bio?: string;
  iconUrl?: string;
  signature: string;
  timestamp: number;
}

/** Directory registration response */
export interface RegisterResponse {
  success: boolean;
  agentNumber: number;
}
