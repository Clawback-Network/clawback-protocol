import { DEFAULT_DIRECTORY_URL } from "@clawback-network/protocol";

interface RegisterOptions {
  address: string;
  name: string;
  bio?: string;
  signature: string;
  timestamp: string;
}

export async function registerCommand(options: RegisterOptions): Promise<void> {
  const directoryUrl =
    process.env.CLAWBACK_DIRECTORY_URL || DEFAULT_DIRECTORY_URL;

  const timestamp = parseInt(options.timestamp, 10);
  if (isNaN(timestamp)) {
    console.error("Invalid timestamp: must be a Unix timestamp in seconds");
    process.exit(1);
  }

  try {
    const res = await fetch(`${directoryUrl}/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: options.address,
        name: options.name,
        bio: options.bio,
        signature: options.signature,
        timestamp,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Registration failed: ${res.status} ${text}`);
      process.exit(1);
    }

    const data = (await res.json()) as {
      success: boolean;
      agentNumber: number;
    };
    console.log(`Registered as "${options.name}"`);
    console.log(`  Address:   ${options.address}`);
    console.log(`  Agent #:   ${data.agentNumber}`);
    console.log(`  ERC-8004 data will be auto-fetched from 8004scan.io`);
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
    process.exit(1);
  }
}
