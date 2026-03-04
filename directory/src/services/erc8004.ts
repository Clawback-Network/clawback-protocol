import { config } from "../config.js";

const BASE_URL =
  process.env.ERC8004_API_URL || config.erc8004ApiUrl;

export interface Erc8004Agent {
  token_id: string;
  chain_id: number;
  name: string;
  description: string;
  owner_address: string;
  is_active: boolean;
  supported_protocols: string[];
  services: Record<string, unknown> | null;
  total_score: number | null;
  total_feedbacks: number;
  x402_supported: boolean;
  image_url: string | null;
  created_at: string;
}

export interface Erc8004Feedback {
  score: number;
  value: string;
  comment: string | null;
  tag1: string | null;
  tag2: string | null;
  user_address: string;
  transaction_hash: string;
  is_revoked: boolean;
  submitted_at: string;
  feedback_uri: string | null;
  feedback_hash: string | null;
}

// Strip API responses down to only the fields we need

function pickAgent(raw: Record<string, unknown>): Erc8004Agent {
  return {
    token_id: raw.token_id as string,
    chain_id: raw.chain_id as number,
    name: raw.name as string,
    description: raw.description as string,
    owner_address: raw.owner_address as string,
    is_active: raw.is_active as boolean,
    supported_protocols: (raw.supported_protocols as string[]) ?? [],
    services: (raw.services as Record<string, unknown>) ?? null,
    total_score: (raw.total_score as number) ?? null,
    total_feedbacks: (raw.total_feedbacks as number) ?? 0,
    x402_supported: (raw.x402_supported as boolean) ?? false,
    image_url: (raw.image_url as string) ?? null,
    created_at: raw.created_at as string,
  };
}

function pickFeedback(raw: Record<string, unknown>): Erc8004Feedback {
  return {
    score: raw.score as number,
    value: raw.value as string,
    comment: (raw.comment as string) ?? null,
    tag1: (raw.tag1 as string) ?? null,
    tag2: (raw.tag2 as string) ?? null,
    user_address: raw.user_address as string,
    transaction_hash: raw.transaction_hash as string,
    is_revoked: raw.is_revoked as boolean,
    submitted_at: raw.submitted_at as string,
    feedback_uri: (raw.feedback_uri as string) ?? null,
    feedback_hash: (raw.feedback_hash as string) ?? null,
  };
}

export interface Erc8004Profile {
  agent: Erc8004Agent | null;
  feedbacks: Erc8004Feedback[];
  fetched_at: string;
}

/**
 * Fetch all ERC-8004 agents owned by an address.
 * Returns the first active agent (or first if none active).
 */
export async function fetchAgentsByOwner(
  address: string,
  chainId: number,
): Promise<Erc8004Agent | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/accounts/${address}/agents?chainId=${chainId}`,
    );
    if (!res.ok) {
      console.warn(
        `[erc8004] fetchAgentsByOwner ${address}: ${res.status} ${res.statusText}`,
      );
      return null;
    }
    const json = await res.json();
    // 8004scan wraps responses in { success, data }
    const raw = (Array.isArray(json) ? json : json.data ?? []) as Record<string, unknown>[];
    if (!raw.length) return null;
    const agents = raw.map(pickAgent);
    return agents.find((a) => a.is_active) ?? agents[0];
  } catch (err) {
    console.warn(
      `[erc8004] fetchAgentsByOwner failed: ${(err as Error).message}`,
    );
    return null;
  }
}

/**
 * Fetch a single ERC-8004 agent by chain and token ID.
 */
export async function fetchAgent(
  chainId: number,
  tokenId: string,
): Promise<Erc8004Agent | null> {
  try {
    const res = await fetch(`${BASE_URL}/agents/${chainId}/${tokenId}`);
    if (!res.ok) {
      console.warn(
        `[erc8004] fetchAgent ${chainId}/${tokenId}: ${res.status} ${res.statusText}`,
      );
      return null;
    }
    const json = await res.json();
    const raw = (json.data ?? json) as Record<string, unknown>;
    return pickAgent(raw);
  } catch (err) {
    console.warn(
      `[erc8004] fetchAgent failed: ${(err as Error).message}`,
    );
    return null;
  }
}

/**
 * Fetch recent feedback for an ERC-8004 agent.
 */
export async function fetchFeedbacks(
  chainId: number,
  tokenId: string,
): Promise<Erc8004Feedback[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/feedbacks?chainId=${chainId}&tokenId=${tokenId}&limit=50`,
    );
    if (!res.ok) {
      console.warn(
        `[erc8004] fetchFeedbacks ${chainId}/${tokenId}: ${res.status} ${res.statusText}`,
      );
      return [];
    }
    const json = await res.json();
    const raw = (Array.isArray(json) ? json : json.data ?? []) as Record<string, unknown>[];
    return raw
      .filter((f) => f.tag1 === "credit" && !f.is_revoked && Number(f.score) > 0)
      .map(pickFeedback);
  } catch (err) {
    console.warn(
      `[erc8004] fetchFeedbacks failed: ${(err as Error).message}`,
    );
    return [];
  }
}

/**
 * Orchestrator: resolve ERC-8004 profile for an address.
 * Looks up agents by owner, then fetches feedbacks if found.
 */
export async function fetchErc8004Profile(
  address: string,
  chainId: number,
): Promise<Erc8004Profile | null> {
  const agent = await fetchAgentsByOwner(address, chainId);

  const feedbacks = agent
    ? await fetchFeedbacks(chainId, agent.token_id)
    : [];

  return {
    agent,
    feedbacks,
    fetched_at: new Date().toISOString(),
  };
}
