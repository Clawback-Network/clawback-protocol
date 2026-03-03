import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { newDb } from "pg-mem";
import { Sequelize } from "sequelize";
import supertest from "supertest";
import { initDb } from "../db.js";
import { app } from "../app.js";

let request: supertest.SuperTest<supertest.Test>;

/** Helper to build a minimal AgentCard for testing */
function makeAgentCard(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Agent",
    description: "A test agent",
    url: "xmtp://0xAgent001",
    version: "0.3.0",
    protocolVersion: "0.3.0",
    skills: [
      {
        id: "lending",
        name: "Lending",
        description: "Assess loans",
        tags: ["lending", "defi"],
      },
    ],
    capabilities: { streaming: false },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    ...overrides,
  };
}

beforeAll(async () => {
  const pgMem = newDb();

  pgMem.public.registerFunction({
    name: "current_database",
    implementation: () => "test",
  });
  pgMem.public.registerFunction({
    name: "version",
    implementation: () => "PostgreSQL 16.0 (pg-mem)",
  });

  const testSequelize = new Sequelize({
    dialect: "postgres",
    dialectModule: pgMem.adapters.createPg(),
    logging: false,
    define: { underscored: true },
  });

  await initDb(testSequelize);

  request = supertest(app) as unknown as supertest.SuperTest<supertest.Test>;
});

describe("health", () => {
  it("returns ok", async () => {
    const res = await request.get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      service: "clawback-directory",
    });
  });
});

describe("POST /agents/register", () => {
  it("registers a new agent with AgentCard", async () => {
    const res = await request.post("/agents/register").send({
      address: "0xAgent001",
      agentCard: makeAgentCard(),
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.agentNumber).toBe("number");
  });

  it("upserts an existing agent", async () => {
    await request.post("/agents/register").send({
      address: "0xAgent002",
      agentCard: makeAgentCard({ name: "Original Name" }),
    });

    const res = await request.post("/agents/register").send({
      address: "0xAgent002",
      agentCard: makeAgentCard({
        name: "Updated Name",
        description: "New bio",
      }),
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects missing address", async () => {
    const res = await request
      .post("/agents/register")
      .send({ agentCard: makeAgentCard() });

    expect(res.status).toBe(400);
  });

  it("rejects missing agentCard", async () => {
    const res = await request
      .post("/agents/register")
      .send({ address: "0xNoCard" });

    expect(res.status).toBe(400);
  });
});

describe("GET /agents/:address", () => {
  it("returns a registered agent with agentCard", async () => {
    const res = await request.get("/agents/0xAgent001");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test Agent");
    expect(res.body.address).toBe("0xagent001");
    expect(res.body.skills).toEqual(["lending", "defi"]);
    expect(res.body.agentCard).toBeTruthy();
    expect(res.body.agentCard.name).toBe("Test Agent");
    expect(res.body.agentCard.protocolVersion).toBe("0.3.0");
  });

  it("returns 404 for unknown agent", async () => {
    const res = await request.get("/agents/0xDoesNotExist");
    expect(res.status).toBe(404);
  });
});

describe("GET /agents/search", () => {
  it("searches by query text", async () => {
    const res = await request.get("/agents/search?q=Test");

    expect(res.status).toBe(200);
    expect(res.body.agents.length).toBeGreaterThan(0);
    expect(
      res.body.agents.some((a: { name: string }) => a.name.includes("Test")),
    ).toBe(true);
  });

  it("includes agentCard in search results", async () => {
    const res = await request.get("/agents/search?q=Test");

    expect(res.status).toBe(200);
    expect(res.body.agents[0].agentCard).toBeTruthy();
    expect(res.body.agents[0].agentCard.url).toContain("xmtp://");
  });

  it("returns empty array for no matches", async () => {
    const res = await request.get("/agents/search?q=zzzznonexistent");

    expect(res.status).toBe(200);
    expect(res.body.agents).toEqual([]);
  });
});

describe("GET /agents/:address/lending", () => {
  it("returns default metrics for agent with no lending history", async () => {
    const res = await request.get("/agents/0xAgent001/lending");

    expect(res.status).toBe(200);
    expect(res.body.loans_requested).toBe(0);
    expect(res.body.loans_completed).toBe(0);
    expect(res.body.accuracy_score).toBe(0.5);
    expect(res.body.blacklisted).toBe(false);
  });
});

describe("GET /stats", () => {
  beforeEach(async () => {
    const { clearStatsCache } = await import("../routes/stats.js");
    clearStatsCache();
  });

  it("returns live stats when no snapshot exists", async () => {
    const { Snapshot } = await import("../models/Snapshot.js");
    await Snapshot.destroy({ where: {} });

    const res = await request.get("/stats");

    expect(res.status).toBe(200);
    expect(typeof res.body.totalAgents).toBe("number");
    expect(Array.isArray(res.body.topSkills)).toBe(true);
    expect(res.body.capturedAt).toBeUndefined();
  });

  it("includes skills from registered agents", async () => {
    const res = await request.get("/stats");

    expect(res.body.topSkills).toContain("lending");
  });

  it("returns snapshot data when a snapshot exists", async () => {
    const { Snapshot } = await import("../models/Snapshot.js");

    await Snapshot.create({
      total_agents: 42,
      online_agents: 7,
      messages_reported: 0,
      top_skills: ["lending", "defi"],
      captured_at: new Date(),
    });

    const res = await request.get("/stats");

    expect(res.status).toBe(200);
    expect(res.body.totalAgents).toBe(42);
    expect(res.body.topSkills).toEqual(["lending", "defi"]);
    expect(typeof res.body.capturedAt).toBe("string");
  });

  it("returns uniqueSkills and totalMessages", async () => {
    const { Snapshot } = await import("../models/Snapshot.js");
    await Snapshot.destroy({ where: {} });

    const res = await request.get("/stats");

    expect(res.status).toBe(200);
    expect(typeof res.body.uniqueSkills).toBe("number");
    expect(typeof res.body.totalMessages).toBe("number");
    expect(res.body.uniqueSkills).toBeGreaterThan(0);
  });
});

describe("GET /stats/history", () => {
  it("returns expected shape", async () => {
    const { Snapshot } = await import("../models/Snapshot.js");

    await Snapshot.create({
      total_agents: 10,
      online_agents: 5,
      messages_reported: 100,
      top_skills: ["lending"],
      captured_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    await Snapshot.create({
      total_agents: 15,
      online_agents: 8,
      messages_reported: 200,
      top_skills: ["lending"],
      captured_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const res = await request.get("/stats/history?days=7");

    expect(res.status).toBe(200);
    expect(res.body.days).toBe(7);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThan(0);

    const entry = res.body.history[0];
    expect(typeof entry.totalAgents).toBe("number");
    expect(typeof entry.messagesReported).toBe("number");
    expect(typeof entry.capturedAt).toBe("string");
  });
});

describe("iconUrl support", () => {
  it("stores iconUrl from agentCard on registration", async () => {
    const card = makeAgentCard({
      name: "Icon Agent",
      iconUrl: "https://example.com/agent-icon.png",
    });
    const res = await request.post("/agents/register").send({
      address: "0xIconAgent001",
      agentCard: card,
    });
    expect(res.status).toBe(200);

    const search = await request.get("/agents/search?q=Icon%20Agent");
    expect(search.status).toBe(200);
    const agent = search.body.agents.find(
      (a: { address: string }) => a.address === "0xiconagent001",
    );
    expect(agent).toBeDefined();
    expect(agent.iconUrl).toBe("https://example.com/agent-icon.png");
  });

  it("returns null iconUrl when not provided", async () => {
    const search = await request.get("/agents/search?q=Test%20Agent");
    expect(search.status).toBe(200);
    const agentWithoutIcon = search.body.agents.find(
      (a: { iconUrl: string | null }) => a.iconUrl === null,
    );
    expect(agentWithoutIcon).toBeDefined();
    expect(agentWithoutIcon.iconUrl).toBeNull();
  });
});
