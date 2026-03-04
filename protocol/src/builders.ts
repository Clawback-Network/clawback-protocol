/** Convenience builders for A2A messages and skills */

import { randomUUID } from "node:crypto";
import type { TextPart, Message, AgentSkill } from "@a2a-js/sdk";

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

/** Build an AgentSkill */
export function buildSkill(
  id: string,
  name: string,
  description: string,
  tags: string[],
): AgentSkill {
  return { id, name, description, tags };
}
