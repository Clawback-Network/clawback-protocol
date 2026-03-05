import { describe, it, expect, vi, beforeEach } from "vitest";
import { CLAWBACK_VERSION } from "@clawback-network/protocol";

// Mock fetch globally so command handlers don't make real HTTP calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("protocol re-exports", () => {
  it("exports a valid semver version", () => {
    expect(CLAWBACK_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("credit commands", () => {
  it("backCommand sends correct payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [{ to: "0x1", data: "0x2" }] }),
    });

    const { backCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await backCommand("0xBorrower", {
      from: "0xSender",
      amount: "500",
      apr: "10",
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/credit/tx/back");
    expect(opts.method).toBe("POST");

    const body = JSON.parse(opts.body);
    expect(body.borrower).toBe("0xBorrower");
    expect(body.from).toBe("0xSender");
    expect(body.amount).toBe(500);
    expect(body.apr).toBe(10);

    consoleSpy.mockRestore();
  });

  it("drawCommand sends correct payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [{ to: "0x1", data: "0x2" }] }),
    });

    const { drawCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await drawCommand({ from: "0xSender", amount: "200" });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/credit/tx/draw");

    const body = JSON.parse(opts.body);
    expect(body.from).toBe("0xSender");
    expect(body.amount).toBe(200);

    consoleSpy.mockRestore();
  });

  it("drawCommand sends maxApr when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [{ to: "0x1", data: "0x2" }] }),
    });

    const { drawCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await drawCommand({ from: "0xSender", amount: "200", maxApr: "20" });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/credit/tx/draw");

    const body = JSON.parse(opts.body);
    expect(body.from).toBe("0xSender");
    expect(body.amount).toBe(200);
    expect(body.maxApr).toBe(2000); // 20% -> 2000 bps

    consoleSpy.mockRestore();
  });

  it("removeBackerCommand sends correct payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [{ to: "0x1", data: "0x2" }] }),
    });

    const { removeBackerCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await removeBackerCommand("0xBacker", { from: "0xBorrower" });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/credit/tx/remove-backer");

    const body = JSON.parse(opts.body);
    expect(body.from).toBe("0xBorrower");
    expect(body.backer).toBe("0xBacker");

    consoleSpy.mockRestore();
  });

  it("creditRepayCommand sends correct payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [{ to: "0x1", data: "0x2" }] }),
    });

    const { creditRepayCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await creditRepayCommand({ from: "0xSender", amount: "250" });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/credit/tx/repay");

    const body = JSON.parse(opts.body);
    expect(body.from).toBe("0xSender");
    expect(body.amount).toBe(250);

    consoleSpy.mockRestore();
  });

  it("feedbackCommand rejects invalid JSON analysis", async () => {
    const { feedbackCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await feedbackCommand("0xBorrower", {
      from: "0xSender",
      score: "85",
      analysis: "not valid json",
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Invalid JSON for --analysis");

    consoleSpy.mockRestore();
  });

  it("feedbackCommand sends valid feedback payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [{ to: "0x1", data: "0x2" }],
        feedbackURI: "ipfs://abc",
        contentHash: "0xdef",
      }),
    });

    const { feedbackCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await feedbackCommand("0xBorrower", {
      from: "0xSender",
      score: "85",
      analysis: '{"reasoning":"Good history"}',
    });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/credit/tx/feedback");

    const body = JSON.parse(opts.body);
    expect(body.borrower).toBe("0xBorrower");
    expect(body.score).toBe(85);
    expect(body.analysis).toEqual({ reasoning: "Good history" });

    consoleSpy.mockRestore();
  });

  it("handles API errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    const { backCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await backCommand("0xBorrower", {
      from: "0xSender",
      amount: "500",
      apr: "10",
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles network errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const { backCommand } = await import("../commands/credit.js");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await backCommand("0xBorrower", {
      from: "0xSender",
      amount: "500",
      apr: "10",
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Could not reach directory: Connection refused",
    );
    consoleSpy.mockRestore();
  });
});
