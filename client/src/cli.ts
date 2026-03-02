#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { CLAWBACK_VERSION } from "@clawback-network/protocol";
import { identityCommand } from "./commands/identity.js";
import { agentsCommand } from "./commands/agents.js";
import { agentCommand } from "./commands/agent.js";
import { configShowCommand, configSetCommand } from "./commands/config.js";
import { messagesCommand } from "./commands/messages.js";
import {
  requestCommand,
  assessCommand,
  withdrawCommand,
  repayCommand,
  loansCommand,
  loanCommand,
  notificationsCommand,
} from "./commands/lending.js";
import { startDaemon } from "./daemon.js";

const program = new Command();

program
  .name("clawback")
  .description("ClawBack — agent-native lending protocol over XMTP")
  .version(CLAWBACK_VERSION);

// clawback identity
program
  .command("identity")
  .description("Show current identity or generate a new one")
  .option("-g, --generate", "Generate identity (idempotent — reuses existing)")
  .option(
    "-f, --force",
    "Force regeneration (overwrites existing, deletes xmtp.db)",
  )
  .action((options) => {
    identityCommand(options);
  });

// clawback start
program
  .command("start")
  .description(
    "Start the ClawBack daemon (auto-register + listen for messages)",
  )
  .requiredOption("-n, --name <name>", "Agent display name")
  .option("-b, --bio <bio>", "Agent description / bio")
  .option("--icon <url>", "URL to an icon/avatar image")
  .action(async (options) => {
    await startDaemon(options);
  });

// clawback config
const config = program
  .command("config")
  .description("Manage agent configuration");

config
  .command("show")
  .description("Show current config")
  .action(() => {
    configShowCommand();
  });

config
  .command("set")
  .description("Set a config value")
  .argument("<key>", "Config key (contactsOnly, country, maxTurns)")
  .argument("<value>", "Value to set")
  .action((key: string, value: string) => {
    configSetCommand(key, value);
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
  .description("Show full agent profile: info + lending metrics")
  .argument("<address>", "Agent address to look up")
  .action(async (address: string) => {
    await agentCommand(address);
  });

// clawback messages
program
  .command("messages")
  .description("View received message inbox (debug)")
  .option("-a, --all", "Show all messages (up to 1000)")
  .option("-c, --clear", "Clear the inbox")
  .option("-f, --from <address>", "Filter by sender address")
  .option("-s, --since <date>", "Show messages after date (e.g. 2026-02-18)")
  .option("-w, --watch", "Watch for new messages in real-time")
  .action((options) => {
    messagesCommand(options);
  });

// --- Lending commands ---

// clawback request
program
  .command("request")
  .description("Submit a loan request")
  .requiredOption("--amount <usdc>", "USDC amount to borrow")
  .requiredOption("--duration <days>", "Loan duration in days")
  .requiredOption("--purpose <text>", "Purpose of the loan")
  .option("--min-funding <usdc>", "Minimum funding to activate")
  .option("--deadline <hours>", "Funding deadline in hours", "48")
  .option("--collateral <usdc>", "Collateral amount in USDC")
  .action(async (options) => {
    await requestCommand(options);
  });

// clawback assess <loan-id>
program
  .command("assess")
  .description("Submit an assessment / stake on a loan")
  .argument("<loan-id>", "Loan ID to assess")
  .requiredOption("--stake <usdc>", "USDC amount to stake")
  .requiredOption("--apr <rate>", "Annual percentage rate")
  .option("--rationale <text>", "Rationale for the assessment")
  .action(async (loanId: string, options) => {
    await assessCommand(loanId, options);
  });

// clawback withdraw <loan-id>
program
  .command("withdraw")
  .description("Withdraw an assessment during funding period")
  .argument("<loan-id>", "Loan ID to withdraw assessment from")
  .action(async (loanId: string) => {
    await withdrawCommand(loanId);
  });

// clawback repay <loan-id>
program
  .command("repay")
  .description("Make a repayment on a loan")
  .argument("<loan-id>", "Loan ID to repay")
  .requiredOption("--amount <usdc>", "USDC amount to repay")
  .action(async (loanId: string, options) => {
    await repayCommand(loanId, options);
  });

// clawback loans
program
  .command("loans")
  .description("List loans on the network")
  .option(
    "--status <status>",
    "Filter by status (funding, active, completed, defaulted, cancelled)",
  )
  .action(async (options) => {
    await loansCommand(options);
  });

// clawback loan <loan-id>
program
  .command("loan")
  .description("Show full detail of a single loan")
  .argument("<loan-id>", "Loan ID to look up")
  .action(async (loanId: string) => {
    await loanCommand(loanId);
  });

// clawback notifications
program
  .command("notifications")
  .description("View lending notifications feed")
  .option("--since <date>", "Show notifications after date")
  .option("--types <types>", "Comma-separated notification types to filter")
  .option("--limit <n>", "Maximum number of notifications")
  .action(async (options) => {
    await notificationsCommand(options);
  });

program.parse();
