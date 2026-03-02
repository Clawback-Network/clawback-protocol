/** Convenience builders for A2A messages, Agent Cards, skills, and lending */

import { randomUUID } from "node:crypto";
import type {
  TextPart,
  DataPart,
  Message,
  AgentCard,
  AgentSkill,
  SendMessageRequest,
  GetTaskRequest,
  CancelTaskRequest,
} from "@a2a-js/sdk";
import { A2A_PROTOCOL_VERSION, CLAWBACK_VERSION } from "./types.js";
import type { LendingAction, LendingMessage } from "./lending-types.js";

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

/** Wrap a Message in a JSON-RPC `message/send` request */
export function createSendMessageRequest(
  message: Message,
  id?: string | number,
): SendMessageRequest {
  return {
    jsonrpc: "2.0",
    id: id ?? randomUUID(),
    method: "message/send",
    params: { message },
  };
}

/** Create a JSON-RPC `tasks/get` request */
export function createGetTaskRequest(
  taskId: string,
  id?: string | number,
): GetTaskRequest {
  return {
    jsonrpc: "2.0",
    id: id ?? randomUUID(),
    method: "tasks/get",
    params: { id: taskId },
  };
}

/** Create a JSON-RPC `tasks/cancel` request */
export function createCancelTaskRequest(
  taskId: string,
  id?: string | number,
): CancelTaskRequest {
  return {
    jsonrpc: "2.0",
    id: id ?? randomUUID(),
    method: "tasks/cancel",
    params: { id: taskId },
  };
}

/** Build a ClawBack AgentCard with XMTP transport */
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
    url: `xmtp://${address}`,
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
    preferredTransport: "XMTP",
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

/** Build an AgentSkill */
export function buildSkill(
  id: string,
  name: string,
  description: string,
  tags: string[],
): AgentSkill {
  return { id, name, description, tags };
}

/** Build a DataPart that carries a lending action */
export function buildLendingDataPart(
  action: LendingAction,
  payload: Record<string, unknown> = {},
  loanId?: string,
): DataPart {
  const data: Record<string, unknown> = {
    protocol: "clawback",
    action,
    payload,
  };
  if (loanId) {
    data.loanId = loanId;
  }
  return {
    kind: "data",
    data,
  };
}

/** Extract a LendingMessage from a DataPart, or null if not a lending action */
export function extractLendingAction(part: DataPart): LendingMessage | null {
  const data = part.data as Record<string, unknown>;
  if (data.protocol === "clawback" && typeof data.action === "string") {
    return {
      action: data.action as LendingAction,
      loanId: typeof data.loanId === "string" ? data.loanId : undefined,
      payload: (data.payload as Record<string, unknown>) ?? {},
    };
  }
  return null;
}
