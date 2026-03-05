import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { newDb } from "pg-mem";
import { Sequelize } from "sequelize";
import supertest from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { initDb } from "../db.js";
import { app } from "../app.js";

let request: supertest.SuperTest<supertest.Test>;

// Test wallet for signing registration payloads
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY);
const TEST_ADDRESS = testAccount.address;

/** Sign a registration message for a given address and timestamp. */
async function signRegister(
  address: string,
  timestamp: number,
): Promise<string> {
  const message = `clawback-register:${address.toLowerCase()}:${timestamp}`;
  return testAccount.signMessage({ message });
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
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
  it("registers a new agent with valid signature", async () => {
    const ts = nowSeconds();
    const signature = await signRegister(TEST_ADDRESS, ts);

    const res = await request.post("/agents/register").send({
      address: TEST_ADDRESS,
      name: "Test Agent",
      signature,
      timestamp: ts,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.agentNumber).toBe("number");
  });

  it("upserts an existing agent", async () => {
    const ts = nowSeconds();
    const signature = await signRegister(TEST_ADDRESS, ts);

    const res = await request.post("/agents/register").send({
      address: TEST_ADDRESS,
      name: "Updated Name",
      bio: "New bio",
      signature,
      timestamp: ts,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects missing address", async () => {
    const res = await request
      .post("/agents/register")
      .send({ name: "No Address", signature: "0x", timestamp: 0 });

    expect(res.status).toBe(400);
  });

  it("rejects missing name", async () => {
    const res = await request
      .post("/agents/register")
      .send({ address: "0xNoName", signature: "0x", timestamp: 0 });

    expect(res.status).toBe(400);
  });

  it("rejects invalid signature", async () => {
    const ts = nowSeconds();
    const res = await request.post("/agents/register").send({
      address: TEST_ADDRESS,
      name: "Bad Sig Agent",
      signature:
        "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      timestamp: ts,
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/signature/i);
  });

  it("rejects stale timestamp", async () => {
    const staleTs = nowSeconds() - 600; // 10 minutes ago
    const signature = await signRegister(TEST_ADDRESS, staleTs);

    const res = await request.post("/agents/register").send({
      address: TEST_ADDRESS,
      name: "Stale Agent",
      signature,
      timestamp: staleTs,
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("rejects signature from wrong address", async () => {
    const ts = nowSeconds();
    // Sign with test account but claim a different address
    const signature = await signRegister(TEST_ADDRESS, ts);

    const res = await request.post("/agents/register").send({
      address: "0x0000000000000000000000000000000000000001",
      name: "Impersonator",
      signature,
      timestamp: ts,
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/signature/i);
  });
});

describe("GET /agents/:address", () => {
  it("returns a registered agent", async () => {
    const res = await request.get(`/agents/${TEST_ADDRESS}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.address).toBe(TEST_ADDRESS.toLowerCase());
  });

  it("returns 404 for unknown agent", async () => {
    const res = await request.get("/agents/0xDoesNotExist");
    expect(res.status).toBe(404);
  });
});

describe("GET /agents/search", () => {
  it("searches by query text", async () => {
    const res = await request.get("/agents/search?q=Updated");

    expect(res.status).toBe(200);
    expect(res.body.agents.length).toBeGreaterThan(0);
    expect(
      res.body.agents.some((a: { name: string }) => a.name.includes("Updated")),
    ).toBe(true);
  });

  it("returns empty array for no matches", async () => {
    const res = await request.get("/agents/search?q=zzzznonexistent");

    expect(res.status).toBe(200);
    expect(res.body.agents).toEqual([]);
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
    expect(typeof res.body.totalCreditLines).toBe("number");
    expect(res.body.capturedAt).toBeUndefined();
  });

  it("always returns live stats even when a snapshot exists", async () => {
    const { Snapshot } = await import("../models/Snapshot.js");

    await Snapshot.create({
      total_agents: 42,
      captured_at: new Date(),
    });

    const res = await request.get("/stats");

    expect(res.status).toBe(200);
    // Live stats count actual agents in DB (1 from earlier test), not snapshot value
    expect(typeof res.body.totalAgents).toBe("number");
    expect(res.body.totalAgents).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /stats/history", () => {
  it("returns expected shape", async () => {
    const { Snapshot } = await import("../models/Snapshot.js");

    await Snapshot.create({
      total_agents: 10,
      captured_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    await Snapshot.create({
      total_agents: 15,
      captured_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const res = await request.get("/stats/history?days=7");

    expect(res.status).toBe(200);
    expect(res.body.days).toBe(7);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThan(0);

    const entry = res.body.history[0];
    expect(typeof entry.totalAgents).toBe("number");
    expect(typeof entry.capturedAt).toBe("string");
  });
});

describe("iconUrl support", () => {
  it("stores iconUrl on registration", async () => {
    const account2 = privateKeyToAccount(
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    );
    const ts = nowSeconds();
    const message = `clawback-register:${account2.address.toLowerCase()}:${ts}`;
    const signature = await account2.signMessage({ message });

    const res = await request.post("/agents/register").send({
      address: account2.address,
      name: "Icon Agent",
      iconUrl: "https://example.com/agent-icon.png",
      signature,
      timestamp: ts,
    });
    expect(res.status).toBe(200);

    const search = await request.get("/agents/search?q=Icon%20Agent");
    expect(search.status).toBe(200);
    const agent = search.body.agents.find(
      (a: { address: string }) => a.address === account2.address.toLowerCase(),
    );
    expect(agent).toBeDefined();
    expect(agent.iconUrl).toBe("https://example.com/agent-icon.png");
  });

  it("returns null iconUrl when not provided", async () => {
    const search = await request.get("/agents/search?q=Updated");
    expect(search.status).toBe(200);
    const agentWithoutIcon = search.body.agents.find(
      (a: { iconUrl: string | null }) => a.iconUrl === null,
    );
    expect(agentWithoutIcon).toBeDefined();
    expect(agentWithoutIcon.iconUrl).toBeNull();
  });
});
