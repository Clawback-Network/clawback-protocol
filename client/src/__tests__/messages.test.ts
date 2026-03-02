import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { loadMessages, appendMessage, clearMessages } from "../messages.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "clawback-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("messages", () => {
  it("returns empty array when no inbox exists", () => {
    const messages = loadMessages(tmpDir);
    expect(messages).toEqual([]);
  });

  it("appends and loads a message", () => {
    appendMessage(
      {
        id: "msg-1",
        from: "0xAlice",
        text: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
      },
      tmpDir,
    );

    const messages = loadMessages(tmpDir);
    expect(messages).toHaveLength(1);
    expect(messages[0].from).toBe("0xAlice");
    expect(messages[0].text).toBe("Hello");
  });

  it("appends multiple messages", () => {
    appendMessage(
      {
        id: "msg-1",
        from: "0xAlice",
        text: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
      },
      tmpDir,
    );
    appendMessage(
      {
        id: "msg-2",
        from: "0xBob",
        text: "Hi",
        timestamp: "2026-01-01T00:01:00Z",
      },
      tmpDir,
    );

    const messages = loadMessages(tmpDir);
    expect(messages).toHaveLength(2);
  });

  it("clears messages", () => {
    appendMessage(
      {
        id: "msg-1",
        from: "0xAlice",
        text: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
      },
      tmpDir,
    );
    clearMessages(tmpDir);

    const messages = loadMessages(tmpDir);
    expect(messages).toEqual([]);
  });

  it("stores method field when provided", () => {
    appendMessage(
      {
        id: "msg-1",
        from: "0xAlice",
        text: '{"jsonrpc":"2.0"}',
        method: "message/send",
        timestamp: "2026-01-01T00:00:00Z",
      },
      tmpDir,
    );

    const messages = loadMessages(tmpDir);
    expect(messages[0].method).toBe("message/send");
  });
});
