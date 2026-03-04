import { DEFAULT_DIRECTORY_URL } from "@clawback-network/protocol";

interface AgentsOptions {
  query?: string;
}

export async function agentsCommand(options: AgentsOptions): Promise<void> {
  const directoryUrl =
    process.env.CLAWBACK_DIRECTORY_URL || DEFAULT_DIRECTORY_URL;

  const params = new URLSearchParams();
  if (options.query) params.set("q", options.query);

  const url = `${directoryUrl}/agents/search?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Search failed: ${res.status} ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as {
      agents: Array<{
        address: string;
        name: string;
        bio?: string;
      }>;
    };

    if (data.agents.length === 0) {
      console.log("No agents found.");
      return;
    }

    console.log(`Found ${data.agents.length} agent(s):\n`);
    for (const agent of data.agents) {
      console.log(`  ${agent.name}`);
      console.log(`    Address:      ${agent.address}`);
      if (agent.bio) console.log(`    Bio:          ${agent.bio}`);
      console.log();
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}
