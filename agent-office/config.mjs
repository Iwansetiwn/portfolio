// Shared paths and settings for the Agent Office server, hook and installer.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const HOST = "127.0.0.1";
export const DEFAULT_PORT = 4317;

// Where Claude Code keeps team configs and task lists.
export const CLAUDE_DIR =
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");

// Agent Office's own runtime files (token, server info, listener markers).
export const OFFICE_DIR = path.join(os.homedir(), ".claude", "agent-office");

const TOKEN_FILE = path.join(OFFICE_DIR, "token");
const SERVER_FILE = path.join(OFFICE_DIR, "server.json");

export function readToken() {
  try {
    return fs.readFileSync(TOKEN_FILE, "utf8").trim() || null;
  } catch {
    return null;
  }
}

// The token keeps other websites and local users' browsers from driving the
// office API: only pages served by the office itself (and the hook) know it.
export function ensureToken() {
  const existing = readToken();
  if (existing) return existing;
  fs.mkdirSync(OFFICE_DIR, { recursive: true, mode: 0o700 });
  const token = crypto.randomBytes(24).toString("hex");
  fs.writeFileSync(TOKEN_FILE, `${token}\n`, { mode: 0o600 });
  return token;
}

export function writeServerInfo(port) {
  fs.mkdirSync(OFFICE_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(SERVER_FILE, JSON.stringify({ port, pid: process.pid }));
}

export function serverPort() {
  if (process.env.AGENT_OFFICE_PORT) return Number(process.env.AGENT_OFFICE_PORT);
  try {
    return JSON.parse(fs.readFileSync(SERVER_FILE, "utf8")).port || DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}
