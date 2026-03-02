import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import * as http from "node:http";
import {
  buildClawBackAgentCard,
  buildSkill,
  DEFAULT_DIRECTORY_URL,
  extractLendingAction,
} from "@clawback/protocol";
import type { TaskState, DataPart } from "@clawback/protocol";
import { InMemoryTaskStore } from "@a2a-js/sdk/server";
import {
  getOrCreateIdentity,
  getConfigDir,
  loadWalletKey,
} from "./identity.js";
import { createClawBackAgent } from "./agent.js";
import { handleA2AMessage } from "./handler.js";
import { createDefaultLogicHandler } from "./logic.js";
import { decodeA2AMessage, isA2ARequest } from "@clawback/protocol";
import { appendMessage } from "./messages.js";
import { startHeartbeat } from "./heartbeat.js";
import { loadConfig, DEFAULT_DEDUP_WINDOW_MS } from "./config.js";

import type { MessageContext } from "@xmtp/agent-sdk";

const DIRECTORY_URL =
  process.env.CLAWBACK_DIRECTORY_URL || DEFAULT_DIRECTORY_URL;

export interface DaemonOptions {
  name?: string;
  bio?: string;
  icon?: string;
}

/**
 * Start the ClawBack daemon — long-running process that listens for messages,
 * sends heartbeats, and registers with the directory.
 */
export async function startDaemon(opts?: DaemonOptions): Promise<void> {
  const configDir = getConfigDir();
  const identity = getOrCreateIdentity(configDir);

  console.log(`[clawback] Starting daemon...`);
  console.log(`[clawback] Address: ${identity.address}`);
  console.log(`[clawback] XMTP env: ${identity.xmtpEnv}`);
  console.log(`[clawback] Config dir: ${configDir}`);

  // Initialize XMTP agent
  const agent = await createClawBackAgent(configDir);
  console.log(`[clawback] XMTP agent initialized`);

  // Build AgentCard — name from opts > env > error
  const agentName = opts?.name || process.env.CLAWBACK_AGENT_NAME;
  if (!agentName) {
    console.error(
      "[clawback] No agent name provided. Use --name or set CLAWBACK_AGENT_NAME.",
    );
    process.exit(1);
  }
  const agentDescription = opts?.bio || process.env.CLAWBACK_AGENT_BIO || "";
  const skillStrings = process.env.CLAWBACK_AGENT_SKILLS
    ? process.env.CLAWBACK_AGENT_SKILLS.split(",").map((s) => s.trim())
    : [];
  const skills = skillStrings.map((s) =>
    buildSkill(s.toLowerCase().replace(/\s+/g, "-"), s, s, [s]),
  );

  const agentCard = buildClawBackAgentCard(
    identity.address,
    agentName,
    agentDescription,
    skills,
    opts?.icon ? { iconUrl: opts.icon } : undefined,
  );

  // Register with directory
  try {
    const res = await fetch(`${DIRECTORY_URL}/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: identity.address,
        agentCard,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { agentNumber: number };
      console.log(
        `[clawback] Registered with directory (agent #${data.agentNumber})`,
      );
    } else {
      console.warn(`[clawback] Directory registration failed: ${res.status}`);
    }
  } catch (err) {
    console.warn(
      `[clawback] Could not reach directory: ${(err as Error).message}`,
    );
  }

  let messagesSent = 0;

  const onTaskOutcome = (_state: TaskState) => {
    // Task outcomes tracked via lending metrics, not generic counters
  };

  // Load agent config
  const agentConfig = loadConfig(configDir);
  if (agentConfig.contactsOnly) {
    console.log(`[clawback] Contacts-only mode enabled`);
  }
  if (agentConfig.country) {
    console.log(`[clawback] Country: ${agentConfig.country}`);
  }

  // Load wallet key for heartbeat signing
  const walletKey = loadWalletKey(configDir);
  if (!walletKey) {
    console.error(
      "[clawback] No wallet key found. Run `clawback identity -g` first.",
    );
    process.exit(1);
  }

  // Start heartbeat with dynamic telemetry (sends deltas, resets on success)
  const stopHeartbeat = startHeartbeat(DIRECTORY_URL, identity, {
    walletKey,
    getTelemetry: () => ({
      messagesSent,
      country: agentConfig.country,
    }),
    onSuccess: () => {
      messagesSent = 0;
    },
  });

  // Create task store and logic handler
  const taskStore = new InMemoryTaskStore();
  const logicHandler = createDefaultLogicHandler();

  // Listen for messages
  agent.on("text", async (ctx: MessageContext<string>) => {
    const content = ctx.message.content;
    if (typeof content !== "string") return;

    const sender = await ctx.getSenderAddress();
    if (!sender) return;
    // Skip messages from self
    if (sender === agent.address) return;

    // Save to inbox
    const decoded = decodeA2AMessage(content);
    appendMessage(
      {
        id: ctx.message.id,
        from: sender,
        text: content,
        method: decoded && isA2ARequest(decoded) ? decoded.method : undefined,
        timestamp: ctx.message.sentAt.toISOString(),
      },
      configDir,
    );

    // Check for lending actions in DataParts
    if (decoded && isA2ARequest(decoded)) {
      const params = decoded.params as {
        message?: { parts?: Array<Record<string, unknown>> };
      };
      const parts = params?.message?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (p.kind === "data") {
            const lendingAction = extractLendingAction(
              p as unknown as DataPart,
            );
            if (lendingAction) {
              console.log(
                `[clawback:lending] ${lendingAction.action} from ${sender}${lendingAction.loanId ? ` (loan: ${lendingAction.loanId})` : ""}`,
              );
            }
          }
        }
      }
    }

    // Handle protocol operations (tasks/get, tasks/cancel, message/send)
    await handleA2AMessage(
      content,
      sender,
      agent,
      taskStore,
      logicHandler,
      onTaskOutcome,
      ctx.conversation,
    );
  });

  // Accept all consent states: 0=Unknown, 1=Allowed, 2=Denied
  await agent.start({
    consentStates: [0, 1, 2],
    disableSync: true,
  } as Parameters<typeof agent.start>[0]);
  console.log(`[clawback] Daemon running. Listening for A2A messages...`);
  console.log(
    `[clawback] TIP: Run \`clawback messages --watch\` in another terminal to monitor incoming messages.`,
  );

  // Start local HTTP API so lending commands can delegate to the daemon

  // Outbound dedup — suppress identical sends within time window.
  const recentSends = new Map<string, number>();

  function isDuplicateSend(address: string, text: string): boolean {
    const key = `${address.toLowerCase()}:${text}`;
    const lastSent = recentSends.get(key);
    const now = Date.now();
    if (lastSent && now - lastSent < DEFAULT_DEDUP_WINDOW_MS) {
      return true;
    }
    recentSends.set(key, now);
    return false;
  }

  // Prune stale dedup entries every 5 minutes
  const dedupCleanup = setInterval(() => {
    const cutoff = Date.now() - DEFAULT_DEDUP_WINDOW_MS;
    for (const [key, ts] of recentSends) {
      if (ts < cutoff) recentSends.delete(key);
    }
  }, 5 * 60_000);
  dedupCleanup.unref();

  const lockPath = path.join(configDir, "daemon.lock");
  const httpServer = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/send") {
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const { address, text } = JSON.parse(body) as {
            address: string;
            text: string;
          };
          if (!address || !text) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "address and text required" }));
            return;
          }
          // Suppress duplicate sends (same recipient + payload within window)
          if (isDuplicateSend(address, text)) {
            console.log(
              `[clawback] outbound dedup: suppressed duplicate to ${address}`,
            );
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, deduped: true }));
            return;
          }
          // Relay pre-encoded A2A payload directly
          const dm = await agent.createDmWithAddress(address as `0x${string}`);
          await dm.sendText(text);
          messagesSent++;

          // Store outbound message for conversation history
          const outboundDecoded = decodeA2AMessage(text);
          appendMessage(
            {
              id: randomUUID(),
              from: identity.address,
              to: address,
              text,
              method:
                outboundDecoded && isA2ARequest(outboundDecoded)
                  ? outboundDecoded.method
                  : undefined,
              timestamp: new Date().toISOString(),
              direction: "outbound",
            },
            configDir,
          );

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });
    } else if (req.method === "GET" && req.url === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          messagesSent,
          status: "running",
        }),
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  // Listen on a random port, write it to daemon.lock
  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => {
      const addr = httpServer.address() as { port: number };
      fs.writeFileSync(lockPath, String(addr.port));
      console.log(`[clawback] Local API on port ${addr.port}`);
      resolve();
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[clawback] Shutting down...");
    stopHeartbeat();
    httpServer.close();
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // lock file may already be gone
    }
    await agent.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Run if executed directly (not when imported by cli.ts)
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  startDaemon().catch((err) => {
    console.error("[clawback] Fatal:", err);
    process.exit(1);
  });
}
