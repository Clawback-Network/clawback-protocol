import { DEFAULT_DIRECTORY_URL } from "@clawback-network/protocol";

interface Erc8004Profile {
  agent: {
    token_id: string;
    chain_id: number;
    name: string;
    description: string;
    is_active: boolean;
  } | null;
  feedbacks: Array<{
    score: number;
    value: string;
    comment: string | null;
    tag1: string | null;
    tag2: string | null;
  }>;
  fetched_at: string;
}

interface AgentProfile {
  address: string;
  name: string;
  bio: string | null;
  registeredAt?: string;
  country?: string | null;
  creditLine?: {
    total_backing: number;
    total_drawn: number;
    available_credit: number;
    blended_apr: number;
    status: string;
    backer_count: number;
  } | null;
  erc8004Profile?: Erc8004Profile | null;
}

export async function agentCommand(address: string): Promise<void> {
  const directoryUrl =
    process.env.CLAWBACK_DIRECTORY_URL || DEFAULT_DIRECTORY_URL;

  try {
    // Fetch agent profile
    const profileRes = await fetch(`${directoryUrl}/agents/${address}`);
    if (!profileRes.ok) {
      if (profileRes.status === 404) {
        console.error(`Agent not found: ${address}`);
      } else {
        console.error(
          `Request failed: ${profileRes.status} ${profileRes.statusText}`,
        );
      }
      return;
    }

    const profile = (await profileRes.json()) as AgentProfile;

    console.log(`=== Agent: ${profile.name} ===\n`);
    console.log(`  Address:      ${profile.address}`);
    if (profile.bio) console.log(`  Bio:          ${profile.bio}`);
    if (profile.country) console.log(`  Country:      ${profile.country}`);
    if (profile.registeredAt)
      console.log(`  Registered:   ${profile.registeredAt}`);
    // Show credit line summary if available
    if (profile.creditLine) {
      const cl = profile.creditLine;
      console.log(`\n  Credit Line:`);
      console.log(`    Total Backing:  ${cl.total_backing} USDC`);
      console.log(`    Total Drawn:    ${cl.total_drawn} USDC`);
      console.log(`    Available:      ${cl.available_credit} USDC`);
      console.log(`    Blended APR:    ${cl.blended_apr.toFixed(2)}%`);
      console.log(`    Status:         ${cl.status}`);
      console.log(`    Backers:        ${cl.backer_count}`);
    }

    // Show ERC-8004 profile if available
    if (profile.erc8004Profile?.agent) {
      const a = profile.erc8004Profile.agent;
      console.log(`\n  ERC-8004:`);
      console.log(`    Token ID:       ${a.token_id}`);
      console.log(`    Name:           ${a.name}`);
      console.log(`    Active:         ${a.is_active}`);
      if (profile.erc8004Profile.feedbacks.length > 0) {
        console.log(
          `    Feedbacks:      ${profile.erc8004Profile.feedbacks.length}`,
        );
      }
      console.log(`    Fetched:        ${profile.erc8004Profile.fetched_at}`);
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}
