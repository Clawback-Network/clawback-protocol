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
  contactSchema,
  validateRegistration,
  loanRequestSchema,
  assessmentSchema,
  lendingMessageSchema,
  lendingActionSchema,
  loanStatusSchema,
  agentLendingMetricsSchema,
  clawBackNotificationSchema,
  clawBackNotificationTypeSchema,
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
    agentCard: {
      name: "Test Agent",
      description: "A test agent",
      url: "clawback://0xabc123",
      version: "0.3.0",
      protocolVersion: "0.3.0",
      skills: [],
      capabilities: {},
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
    },
  };

  it("validates a valid registration payload", () => {
    const result = registerPayloadSchema.parse(validPayload);
    expect(result.address).toBe("0xabc123");
    expect(result.agentCard.name).toBe("Test Agent");
  });

  it("rejects missing address", () => {
    const { address: _, ...noAddr } = validPayload;
    expect(() => registerPayloadSchema.parse(noAddr)).toThrow();
  });

  it("rejects missing agentCard", () => {
    expect(() =>
      registerPayloadSchema.parse({ address: "0xabc123" }),
    ).toThrow();
  });
});

describe("validateRegistration", () => {
  it("returns parsed data for valid input", () => {
    const result = validateRegistration({
      address: "0xabc123",
      agentCard: {
        name: "Agent",
        description: "Desc",
        url: "clawback://0xabc123",
        version: "0.3.0",
        protocolVersion: "0.3.0",
        skills: [],
        capabilities: {},
        defaultInputModes: ["text/plain"],
        defaultOutputModes: ["text/plain"],
      },
    });
    expect(result.address).toBe("0xabc123");
  });

  it("throws for invalid input", () => {
    expect(() => validateRegistration({})).toThrow();
  });
});

describe("contactSchema", () => {
  it("validates a contact", () => {
    const result = contactSchema.parse({
      name: "Alice",
      address: "0xabc",
      addedAt: "2026-01-01T00:00:00Z",
      trusted: true,
    });
    expect(result.trusted).toBe(true);
  });
});

// --- Lending schema tests ---

describe("lendingActionSchema", () => {
  it("validates all lending actions", () => {
    const actions = [
      "request",
      "assess",
      "withdraw",
      "repay",
      "activate",
      "cancel",
      "complete",
      "default",
      "query",
      "notify",
    ];
    for (const action of actions) {
      expect(lendingActionSchema.parse(action)).toBe(action);
    }
  });

  it("rejects invalid action", () => {
    expect(() => lendingActionSchema.parse("invalid")).toThrow();
  });
});

describe("loanStatusSchema", () => {
  it("validates all loan statuses", () => {
    const statuses = [
      "funding",
      "active",
      "completed",
      "defaulted",
      "cancelled",
    ];
    for (const status of statuses) {
      expect(loanStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects invalid status", () => {
    expect(() => loanStatusSchema.parse("pending")).toThrow();
  });
});

describe("loanRequestSchema", () => {
  it("validates a valid loan request", () => {
    const result = loanRequestSchema.parse({
      amount_requested: 1000,
      funding_deadline_hours: 48,
      duration_days: 30,
      purpose: "Working capital",
    });
    expect(result.amount_requested).toBe(1000);
    expect(result.duration_days).toBe(30);
  });

  it("accepts optional fields", () => {
    const result = loanRequestSchema.parse({
      amount_requested: 5000,
      duration_days: 90,
      purpose: "Equipment",
      min_funding_amount: 2500,
      funding_deadline_hours: 72,
      collateral_amount: 1000,
    });
    expect(result.min_funding_amount).toBe(2500);
    expect(result.funding_deadline_hours).toBe(72);
    expect(result.collateral_amount).toBe(1000);
  });

  it("rejects negative amount", () => {
    expect(() =>
      loanRequestSchema.parse({
        amount_requested: -100,
        duration_days: 30,
        purpose: "Test",
      }),
    ).toThrow();
  });

  it("rejects missing purpose", () => {
    expect(() =>
      loanRequestSchema.parse({
        amount_requested: 1000,
        duration_days: 30,
      }),
    ).toThrow();
  });
});

describe("assessmentSchema", () => {
  it("validates a valid assessment", () => {
    const result = assessmentSchema.parse({
      loan_id: "loan-001",
      stake_amount: 500,
      apr: 8.5,
      decision: "fund",
    });
    expect(result.loan_id).toBe("loan-001");
    expect(result.decision).toBe("fund");
  });

  it("accepts reject decision", () => {
    const result = assessmentSchema.parse({
      loan_id: "loan-001",
      stake_amount: 1,
      apr: 0,
      decision: "reject",
      rationale: "Too risky",
    });
    expect(result.decision).toBe("reject");
    expect(result.rationale).toBe("Too risky");
  });

  it("rejects invalid decision", () => {
    expect(() =>
      assessmentSchema.parse({
        loan_id: "loan-001",
        stake_amount: 500,
        apr: 8.5,
        decision: "maybe",
      }),
    ).toThrow();
  });
});

describe("lendingMessageSchema", () => {
  it("validates a lending message", () => {
    const result = lendingMessageSchema.parse({
      action: "request",
      payload: { amount: 1000 },
    });
    expect(result.action).toBe("request");
  });

  it("accepts optional loanId", () => {
    const result = lendingMessageSchema.parse({
      action: "assess",
      loanId: "loan-001",
      payload: { stake: 500 },
    });
    expect(result.loanId).toBe("loan-001");
  });
});

describe("agentLendingMetricsSchema", () => {
  it("validates full metrics", () => {
    const result = agentLendingMetricsSchema.parse({
      loans_requested: 5,
      loans_completed: 3,
      loans_defaulted: 1,
      total_borrowed: 10000,
      total_repaid: 8000,
      assessments_made: 10,
      accuracy_score: 0.85,
      total_staked: 5000,
      total_earned: 500,
      total_lost: 100,
      blacklisted: false,
    });
    expect(result.accuracy_score).toBe(0.85);
    expect(result.blacklisted).toBe(false);
  });
});

describe("clawBackNotificationTypeSchema", () => {
  it("validates all notification types", () => {
    const types = [
      "loan_created",
      "loan_funded",
      "loan_activated",
      "loan_completed",
      "loan_defaulted",
      "loan_cancelled",
      "assessment_received",
      "assessment_withdrawn",
      "repayment_received",
      "deadline_approaching",
    ];
    for (const type of types) {
      expect(clawBackNotificationTypeSchema.parse(type)).toBe(type);
    }
  });
});

describe("clawBackNotificationSchema", () => {
  it("validates a notification", () => {
    const result = clawBackNotificationSchema.parse({
      id: "notif-001",
      type: "loan_created",
      loan_id: "loan-001",
      agent_addr: "0xabc123",
      data: { amount: 1000 },
      timestamp: "2026-01-15T00:00:00Z",
    });
    expect(result.type).toBe("loan_created");
    expect(result.loan_id).toBe("loan-001");
  });
});
