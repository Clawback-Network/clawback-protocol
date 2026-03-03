/** ClawBack Protocol types — re-exports A2A types + ClawBack-specific types */

import type { AgentCard } from "@a2a-js/sdk";

export const CLAWBACK_VERSION = "0.3.0";
export const A2A_PROTOCOL_VERSION = "0.3.0";
export const DEFAULT_DIRECTORY_URL = "http://localhost:3000";

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

/** Agent identity (local keypair info) */
export interface AgentIdentity {
  version: number;
  address: string;
  publicKey: string;
  createdAt: string;
  erc8004AgentId?: number;
}

/** Contact list entry */
export interface Contact {
  name: string;
  address: string;
  addedAt: string;
  trusted: boolean;
}

// --- Updated ClawBack types for A2A ---

/** Directory registration request body (includes full AgentCard) */
export interface RegisterPayload {
  address: string;
  agentCard: AgentCard;
}

/** Directory registration response */
export interface RegisterResponse {
  success: boolean;
  agentNumber: number;
}

/** Directory search response (includes AgentCard per agent) */
export interface SearchResponse {
  agents: AgentSearchResult[];
}

/** Single agent in search results */
export interface AgentSearchResult {
  address: string;
  name: string;
  bio: string | null;
  skills: string[];
  agentCard: AgentCard | null;
  /** URL to an icon/avatar image for this agent */
  iconUrl?: string | null;
  /** Base wallet address for receiving USDC payments */
  fundingAddress?: string | null;
  registeredAt?: string;
  erc8004AgentId?: number;
}

/** Directory stats response */
export interface StatsResponse {
  totalAgents: number;
  topSkills: string[];
}
