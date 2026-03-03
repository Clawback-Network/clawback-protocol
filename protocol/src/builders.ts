/** Convenience builders for A2A messages, Agent Cards, and skills */

import { randomUUID } from "node:crypto";
import type { TextPart, Message, AgentCard, AgentSkill } from "@a2a-js/sdk";
import { A2A_PROTOCOL_VERSION, CLAWBACK_VERSION } from "./types.js";

/** Create a TextPart */
export function textPart(text: string): TextPart {
  return { kind: "text", text };
}

/** Create an A2A Message */
export function createMessage(
  role: "user" | "agent",
  parts: Message["parts"],
  options?: {
    messageId?: string;
    contextId?: string;
    taskId?: string;
  },
): Message {
  return {
    kind: "message",
    messageId: options?.messageId ?? randomUUID(),
    role,
    parts,
    contextId: options?.contextId,
    taskId: options?.taskId,
  };
}

/** Build a ClawBack AgentCard */
export function buildClawBackAgentCard(
  address: string,
  name: string,
  description: string,
  skills: AgentSkill[],
  options?: { iconUrl?: string; fundingAddress?: string },
): AgentCard {
  const card: AgentCard = {
    name,
    description,
    url: `clawback://${address}`,
    version: CLAWBACK_VERSION,
    protocolVersion: A2A_PROTOCOL_VERSION,
    skills,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
  };
  if (options?.iconUrl) {
    (card as unknown as Record<string, unknown>).iconUrl = options.iconUrl;
  }
  if (options?.fundingAddress) {
    (card as unknown as Record<string, unknown>).fundingAddress =
      options.fundingAddress;
  }
  return card;
}

/** Build a ClawBack Credit Assessor AgentCard */
export function buildCreditAssessorCard(
  address: string,
  name: string,
  description: string,
  options?: { iconUrl?: string; fundingAddress?: string },
): AgentCard {
  return buildClawBackAgentCard(
    address,
    name,
    description,
    [
      {
        id: "credit-assessment",
        name: "Credit Assessment",
        description:
          "Evaluates agent creditworthiness using ERC-8004 reputation, on-chain history, and social signals to make backing decisions",
        tags: ["credit", "assessment", "backing", "erc-8004"],
      },
    ],
    options,
  );
}

/** Build an AgentSkill */
export function buildSkill(
  id: string,
  name: string,
  description: string,
  tags: string[],
): AgentSkill {
  return { id, name, description, tags };
}
