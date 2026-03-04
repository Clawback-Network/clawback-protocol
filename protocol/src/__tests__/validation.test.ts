import { describe, it, expect } from "vitest";
import {
  partSchema,
  a2aMessageSchema,
  taskStatusSchema,
  taskSchema,
  artifactSchema,
  agentSkillSchema,
  agentCardSchema,
  registerPayloadSchema,
  validateRegistration,
} from "../index.js";

describe("partSchema", () => {
  it("validates a text part", () => {
    const result = partSchema.parse({ kind: "text", text: "hello" });
    expect(result.kind).toBe("text");
  });

  it("validates a data part", () => {
    const result = partSchema.parse({
      kind: "data",
      data: { key: "value" },
    });
    expect(result.kind).toBe("data");
  });

  it("validates a file part with bytes", () => {
    const result = partSchema.parse({
      kind: "file",
      file: { bytes: "base64data", mimeType: "text/plain" },
    });
    expect(result.kind).toBe("file");
  });

  it("validates a file part with uri", () => {
    const result = partSchema.parse({
      kind: "file",
      file: { uri: "https://example.com/file.txt" },
    });
    expect(result.kind).toBe("file");
  });

  it("rejects invalid kind", () => {
    expect(() => partSchema.parse({ kind: "invalid", text: "x" })).toThrow();
  });
});

describe("a2aMessageSchema", () => {
  it("validates a valid message", () => {
    const result = a2aMessageSchema.parse({
      kind: "message",
      messageId: "msg-1",
      role: "user",
      parts: [{ kind: "text", text: "Hello" }],
    });
    expect(result.role).toBe("user");
    expect(result.parts).toHaveLength(1);
  });

  it("rejects message without parts", () => {
    expect(() =>
      a2aMessageSchema.parse({
        kind: "message",
        messageId: "msg-1",
        role: "user",
        parts: [],
      }),
    ).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() =>
      a2aMessageSchema.parse({
        kind: "message",
        messageId: "msg-1",
        role: "system",
        parts: [{ kind: "text", text: "Hello" }],
      }),
    ).toThrow();
  });
});

describe("taskStatusSchema", () => {
  it("validates a valid status", () => {
    const result = taskStatusSchema.parse({ state: "submitted" });
    expect(result.state).toBe("submitted");
  });

  it("validates all task states", () => {
    const states = [
      "submitted",
      "working",
      "input-required",
      "completed",
      "canceled",
      "failed",
      "rejected",
      "auth-required",
      "unknown",
    ];
    for (const state of states) {
      expect(taskStatusSchema.parse({ state }).state).toBe(state);
    }
  });

  it("rejects invalid state", () => {
    expect(() => taskStatusSchema.parse({ state: "pending" })).toThrow();
  });
});

describe("artifactSchema", () => {
  it("validates a valid artifact", () => {
    const result = artifactSchema.parse({
      artifactId: "art-1",
      parts: [{ kind: "text", text: "output" }],
    });
    expect(result.artifactId).toBe("art-1");
  });
});

describe("taskSchema", () => {
  it("validates a valid task", () => {
    const result = taskSchema.parse({
      kind: "task",
      id: "task-1",
      contextId: "ctx-1",
      status: { state: "working" },
    });
    expect(result.id).toBe("task-1");
    expect(result.status.state).toBe("working");
  });

  it("validates a task with artifacts", () => {
    const result = taskSchema.parse({
      kind: "task",
      id: "task-2",
      contextId: "ctx-2",
      status: { state: "completed" },
      artifacts: [
        {
          artifactId: "art-1",
          parts: [{ kind: "text", text: "result" }],
        },
      ],
    });
    expect(result.artifacts).toHaveLength(1);
  });
});

describe("agentSkillSchema", () => {
  it("validates a valid skill", () => {
    const result = agentSkillSchema.parse({
      id: "lending",
      name: "Lending",
      description: "Assess loan requests",
      tags: ["defi", "lending"],
    });
    expect(result.id).toBe("lending");
    expect(result.tags).toEqual(["defi", "lending"]);
  });

  it("rejects skill without id", () => {
    expect(() =>
      agentSkillSchema.parse({
        name: "Lending",
        description: "Assess loan requests",
        tags: [],
      }),
    ).toThrow();
  });
});

describe("agentCardSchema", () => {
  const validCard = {
    name: "Test Agent",
    description: "A test agent",
    url: "clawback://0xabc123",
    version: "0.3.0",
    protocolVersion: "0.3.0",
    skills: [
      {
        id: "lending",
        name: "Lending",
        description: "Assess loans",
        tags: [],
      },
    ],
    capabilities: { streaming: false },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
  };

  it("validates a valid agent card", () => {
    const result = agentCardSchema.parse(validCard);
    expect(result.name).toBe("Test Agent");
    expect(result.skills).toHaveLength(1);
  });

  it("rejects card without name", () => {
    const { name: _, ...noName } = validCard;
    expect(() => agentCardSchema.parse(noName)).toThrow();
  });

  it("rejects card without skills", () => {
    const { skills: _, ...noSkills } = validCard;
    expect(() => agentCardSchema.parse(noSkills)).toThrow();
  });
});

describe("registerPayloadSchema", () => {
  const validPayload = {
    address: "0xabc123",
    name: "Test Agent",
    signature: "0xdeadbeef",
    timestamp: 1700000000,
  };

  it("validates a valid registration payload", () => {
    const result = registerPayloadSchema.parse(validPayload);
    expect(result.address).toBe("0xabc123");
    expect(result.name).toBe("Test Agent");
    expect(result.signature).toBe("0xdeadbeef");
    expect(result.timestamp).toBe(1700000000);
  });

  it("validates payload with optional fields", () => {
    const result = registerPayloadSchema.parse({
      ...validPayload,
      bio: "A test agent",
      iconUrl: "https://example.com/icon.png",
    });
    expect(result.bio).toBe("A test agent");
    expect(result.iconUrl).toBe("https://example.com/icon.png");
  });

  it("rejects missing address", () => {
    expect(() =>
      registerPayloadSchema.parse({ name: "Test", signature: "0x", timestamp: 0 }),
    ).toThrow();
  });

  it("rejects missing name", () => {
    expect(() =>
      registerPayloadSchema.parse({ address: "0xabc123", signature: "0x", timestamp: 0 }),
    ).toThrow();
  });

  it("rejects missing signature", () => {
    expect(() =>
      registerPayloadSchema.parse({ address: "0xabc123", name: "Test", timestamp: 0 }),
    ).toThrow();
  });

  it("rejects missing timestamp", () => {
    expect(() =>
      registerPayloadSchema.parse({ address: "0xabc123", name: "Test", signature: "0x" }),
    ).toThrow();
  });
});

describe("validateRegistration", () => {
  it("returns parsed data for valid input", () => {
    const result = validateRegistration({
      address: "0xabc123",
      name: "Agent",
      signature: "0xdeadbeef",
      timestamp: 1700000000,
    });
    expect(result.address).toBe("0xabc123");
    expect(result.name).toBe("Agent");
  });

  it("throws for invalid input", () => {
    expect(() => validateRegistration({})).toThrow();
  });
});

