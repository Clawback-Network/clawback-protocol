import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { getOrCreateIdentity } from "../identity.js";
import { loadConfig, saveConfig } from "../config.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "clawback-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("getOrCreateIdentity", () => {
  it("creates a new identity on first call", () => {
    const identity = getOrCreateIdentity(tmpDir);
    expect(identity.address).toBeTruthy();
    expect(identity.address.startsWith("0x")).toBe(true);
    expect(identity.publicKey).toBeTruthy();
    expect(identity.version).toBe(1);
  });

  it("returns same identity on subsequent calls", () => {
    const first = getOrCreateIdentity(tmpDir);
    const second = getOrCreateIdentity(tmpDir);
    expect(first.address).toBe(second.address);
    expect(first.publicKey).toBe(second.publicKey);
  });

  it("creates identity.json file", () => {
    getOrCreateIdentity(tmpDir);
    const identityPath = path.join(tmpDir, "identity.json");
    expect(fs.existsSync(identityPath)).toBe(true);
  });
});

describe("config", () => {
  it("returns defaults when no config exists", () => {
    const config = loadConfig(tmpDir);
    expect(config.contactsOnly).toBe(false);
  });

  it("roundtrips config through save and load", () => {
    const config = { contactsOnly: true, country: "NO" };
    saveConfig(config, tmpDir);
    const loaded = loadConfig(tmpDir);
    expect(loaded.contactsOnly).toBe(true);
    expect(loaded.country).toBe("NO");
  });

  it("saves config to config.json file", () => {
    saveConfig({ contactsOnly: false }, tmpDir);
    const configPath = path.join(tmpDir, "config.json");
    expect(fs.existsSync(configPath)).toBe(true);
  });
});
