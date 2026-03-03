import type { AgentCard } from "@a2a-js/sdk";

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
        skills?: string[];
        agentCard?: AgentCard | null;
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
      if (agent.skills?.length)
        console.log(`    Skills:       ${agent.skills.join(", ")}`);
      if (agent.agentCard) {
        console.log(
          `    Transport:    ${agent.agentCard.preferredTransport || "JSONRPC"}`,
        );
        console.log(
          `    Protocol:     A2A v${agent.agentCard.protocolVersion}`,
        );
        if (agent.agentCard.skills.length > 0) {
          const skillNames = agent.agentCard.skills
            .map((s) => s.name)
            .join(", ");
          console.log(`    A2A Skills:   ${skillNames}`);
        }
      }
      console.log();
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}
