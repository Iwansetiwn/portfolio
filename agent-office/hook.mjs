#!/usr/bin/env node
// Claude Code hook entry point for Agent Office.
//
//   node hook.mjs event   Forward the hook's JSON input to the office server.
//                         Installed as an async hook, so it never slows Claude.
//   node hook.mjs listen  Installed as an asyncRewake hook on SessionStart and
//                         Stop of the lead session. Long-polls the office for
//                         dashboard commands; when one arrives it prints them
//                         to stderr and exits 2, which wakes the lead session.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HOST, OFFICE_DIR, readToken, serverPort } from "./config.mjs";

// Stay under the hook timeout the installer sets (86400s).
const LISTEN_MS = 86_000 * 1000;
const RETRY_MS = 5000;

const mode = process.argv[2];
const raw = await readStdin();

if (mode === "event") {
  try {
    await request("POST", "/api/hook", raw, 1500);
  } catch {
    // The dashboard isn't running; nothing to do.
  }
  process.exit(0);
}

if (mode === "listen") {
  await listen();
}

process.exit(0);

async function listen() {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }
  // Only the lead listens. Teammates and subagents carry an agent_id.
  if (!input.session_id || input.agent_id) return;

  const session = input.session_id;
  const listener = crypto.randomUUID();
  const started = Date.now();
  const marker = path.join(OFFICE_DIR, "listeners", `${session.replace(/[^\w-]/g, "")}.json`);
  fs.mkdirSync(path.dirname(marker), { recursive: true, mode: 0o700 });
  fs.writeFileSync(marker, JSON.stringify({ listener, started, pid: process.pid }));

  // A newer listener for the same session (armed by a later Stop) replaces this one.
  const isCurrent = () => {
    try {
      return JSON.parse(fs.readFileSync(marker, "utf8")).listener === listener;
    } catch {
      return false;
    }
  };

  const query = new URLSearchParams({
    session,
    listener,
    started: String(started),
    cwd: input.cwd || "",
  });

  while (Date.now() - started < LISTEN_MS && isCurrent()) {
    let reply;
    try {
      reply = JSON.parse(await request("GET", `/api/listen?${query}`, null, 40_000));
    } catch {
      await sleep(RETRY_MS);
      continue;
    }
    if (reply.superseded || reply.ended) return;
    if (reply.message) {
      process.stderr.write(reply.message);
      process.exit(2);
    }
  }
}

async function request(method, urlPath, body, timeoutMs) {
  const token = readToken();
  if (!token) throw new Error("Agent Office has not been started yet");
  const res = await fetch(`http://${HOST}:${serverPort()}${urlPath}`, {
    method,
    headers: { "content-type": "application/json", "x-office-token": token },
    body: body ?? undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Agent Office replied ${res.status}`);
  return res.text();
}

async function readStdin() {
  if (process.stdin.isTTY) return "{}";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8") || "{}";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
