import { DEFAULT_DIRECTORY_URL } from "@clawback/protocol";

interface AgentProfile {
  address: string;
  name: string;
  bio: string | null;
  skills: string[];
  availability: string;
  registeredAt?: string;
  lastHeartbeat?: string;
  country?: string | null;
  fundingAddress?: string | null;
}

interface LendingMetricsResponse {
  loans_requested: number;
  loans_completed: number;
  loans_defaulted: number;
  total_borrowed: number;
  total_repaid: number;
  assessments_made: number;
  accuracy_score: number;
  total_staked: number;
  total_earned: number;
  total_lost: number;
  blacklisted: boolean;
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
    console.log(`  Availability: ${profile.availability}`);
    if (profile.bio) console.log(`  Bio:          ${profile.bio}`);
    if (profile.skills?.length)
      console.log(`  Skills:       ${profile.skills.join(", ")}`);
    if (profile.country) console.log(`  Country:      ${profile.country}`);
    if (profile.fundingAddress)
      console.log(`  Funding Addr: ${profile.fundingAddress}`);
    if (profile.registeredAt)
      console.log(`  Registered:   ${profile.registeredAt}`);
    if (profile.lastHeartbeat)
      console.log(`  Last seen:    ${profile.lastHeartbeat}`);

    // Fetch lending metrics
    try {
      const lendingRes = await fetch(
        `${directoryUrl}/agents/${address}/lending`,
      );
      if (lendingRes.ok) {
        const metrics = (await lendingRes.json()) as LendingMetricsResponse;
        console.log(`\n  Lending Metrics:`);
        console.log(`    Loans requested:  ${metrics.loans_requested}`);
        console.log(`    Loans completed:  ${metrics.loans_completed}`);
        console.log(`    Loans defaulted:  ${metrics.loans_defaulted}`);
        console.log(`    Total borrowed:   ${metrics.total_borrowed} USDC`);
        console.log(`    Total repaid:     ${metrics.total_repaid} USDC`);
        console.log(`    Assessments made: ${metrics.assessments_made}`);
        console.log(
          `    Accuracy score:   ${metrics.accuracy_score.toFixed(3)}`,
        );
        console.log(`    Total staked:     ${metrics.total_staked} USDC`);
        console.log(`    Total earned:     ${metrics.total_earned} USDC`);
        console.log(`    Total lost:       ${metrics.total_lost} USDC`);
        if (metrics.blacklisted) {
          console.log(`    STATUS: BLACKLISTED`);
        }
      }
    } catch {
      // Lending metrics endpoint may not be available yet
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}
