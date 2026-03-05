#!/usr/bin/env node
import { Command } from "commander";
import { CLAWBACK_VERSION } from "@clawback-network/protocol";
import { registerCommand } from "./commands/register.js";
import { agentsCommand } from "./commands/agents.js";
import { agentCommand } from "./commands/agent.js";
import {
  backCommand,
  adjustBackingCommand,
  withdrawBackingCommand,
  drawCommand,
  creditRepayCommand,
  creditLineCommand,
  backingsCommand,
  eventsCommand,
  feedbackCommand,
  register8004Command,
  removeBackerCommand,
} from "./commands/credit.js";

const program = new Command();

program
  .name("clawback")
  .description("ClawBack — agent-native credit protocol")
  .version(CLAWBACK_VERSION);

// clawback register
program
  .command("register")
  .description("Register your agent with the directory")
  .requiredOption("--address <address>", "Your agent address")
  .requiredOption("--name <name>", "Agent name")
  .option("--bio <bio>", "Short description of your agent")
  .requiredOption(
    "--signature <sig>",
    "Hex signature proving address ownership",
  )
  .requiredOption(
    "--timestamp <ts>",
    "Unix timestamp (seconds) when signature was created",
  )
  .action(async (options) => {
    await registerCommand(options);
  });

// clawback agents
program
  .command("agents")
  .description("Search directory for agents")
  .option("-q, --query <query>", "Text search across names and bios")
  .option("--online", "Only show online agents")
  .action(async (options) => {
    await agentsCommand(options);
  });

// clawback agent <address>
program
  .command("agent")
  .description("Show full agent profile")
  .argument("<address>", "Agent address to look up")
  .action(async (address: string) => {
    await agentCommand(address);
  });

// --- Credit line commands ---

const credit = program
  .command("credit")
  .description("Revolving credit line commands");

credit
  .command("line")
  .description("View an agent's credit line")
  .argument("<address>", "Agent address")
  .action(async (address: string) => {
    await creditLineCommand(address);
  });

credit
  .command("backings")
  .description("View backing positions for an address")
  .argument("<address>", "Assessor address")
  .action(async (address: string) => {
    await backingsCommand(address);
  });

credit
  .command("events")
  .description("View recent credit events for an address")
  .argument("<address>", "Address to query")
  .action(async (address: string) => {
    await eventsCommand(address);
  });

credit
  .command("back")
  .description("Back an agent with a standing USDC commitment")
  .argument("<address>", "Agent address to back")
  .requiredOption("--from <address>", "Sender address")
  .requiredOption("--amount <usdc>", "Max USDC exposure")
  .requiredOption("--apr <rate>", "Annual rate in percent (e.g. 10)")
  .action(async (address: string, options) => {
    await backCommand(address, options);
  });

credit
  .command("adjust")
  .description("Adjust backing amount and APR")
  .argument("<address>", "Agent address")
  .requiredOption("--from <address>", "Sender address")
  .requiredOption("--amount <usdc>", "New max USDC exposure")
  .requiredOption("--apr <rate>", "New APR in percent")
  .action(async (address: string, options) => {
    await adjustBackingCommand(address, options);
  });

credit
  .command("withdraw")
  .description("Withdraw all backing from an agent")
  .argument("<address>", "Agent address to stop backing")
  .requiredOption("--from <address>", "Sender address")
  .action(async (address: string, options) => {
    await withdrawBackingCommand(address, options);
  });

credit
  .command("draw")
  .description("Draw USDC from your credit line")
  .requiredOption("--from <address>", "Sender address")
  .requiredOption("--amount <usdc>", "USDC amount to draw")
  .option(
    "--max-apr <rate>",
    "Max APR in percent (e.g. 20) — excludes higher-rate backers",
  )
  .action(async (options) => {
    await drawCommand(options);
  });

credit
  .command("remove-backer")
  .description("Remove a zero-drawn backer from your credit line")
  .argument("<address>", "Backer address to remove")
  .requiredOption("--from <address>", "Borrower address")
  .action(async (address: string, options) => {
    await removeBackerCommand(address, options);
  });

credit
  .command("repay")
  .description("Repay your credit line")
  .requiredOption("--from <address>", "Sender address")
  .requiredOption("--amount <usdc>", "USDC amount to repay")
  .action(async (options) => {
    await creditRepayCommand(options);
  });

credit
  .command("feedback")
  .description("Submit ERC-8004 credit feedback for an agent")
  .argument("<address>", "Agent address to give feedback on")
  .requiredOption("--from <address>", "Your assessor address")
  .requiredOption("--score <0-100>", "Credit score (0–100)")
  .requiredOption("--analysis <json>", "Analysis JSON string")
  .action(async (address: string, options) => {
    await feedbackCommand(address, options);
  });

credit
  .command("register-8004")
  .description("Register a new ERC-8004 agent identity (mint agent NFT)")
  .requiredOption("--name <name>", "Agent name")
  .option("--description <desc>", "Agent description")
  .action(async (options) => {
    await register8004Command(options);
  });

program.parse();
