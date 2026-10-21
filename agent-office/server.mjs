#!/usr/bin/env node
// Agent Office: a live office view of a Claude Code agent team.
//
// Claude Code hooks (see hook.mjs) post every session event here. The server
// keeps a picture of each session's team in memory, merges in the team config
// and task list Claude Code writes under ~/.claude, and streams it to the
// browser. Commands typed in the dashboard are queued per session and handed
// to the lead through its listening hook.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLAUDE_DIR, DEFAULT_PORT, HOST, ensureToken, writeServerInfo } from "./config.mjs";

const PORT = Number(process.env.AGENT_OFFICE_PORT) || DEFAULT_PORT;
const UI_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");
const TOKEN = ensureToken();

const POLL_HOLD_MS = 25_000;
const LISTENING_GRACE_MS = 45_000;
const FEED_LIMIT = 300;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
const MODELS = new Set(["", "inherit", "opus", "sonnet", "haiku"]);

/** @type {Map<string, any>} */
const sessions = new Map();
const streams = new Set();
let nextId = 1;

// ---------------------------------------------------------------------------
// Session state

function getSession(id, cwd) {
  let s = sessions.get(id);
  if (!s) {
    s = {
      id,
      cwd: cwd || "",
      teamName: `session-${id.slice(0, 8)}`,
      startedAt: Date.now(),
      lastEventAt: Date.now(),
      ended: false,
      agents: new Map(),
      agentIds: new Map(), // hook agent_id -> agent key
      inConfig: new Set(), // teammate keys seen in the team config
      tasks: new Map(),
      feed: [],
      queue: [],
      listener: null,
    };
    s.agents.set("lead", newAgent("lead", "Lead", "lead"));
    sessions.set(id, s);
  }
  if (cwd) s.cwd = cwd;
  return s;
}

function newAgent(key, name, kind) {
  return {
    key,
    name,
    kind, // lead | teammate | subagent
    role: kind === "lead" ? "team-lead" : "",
    model: "",
    status: kind === "lead" ? "idle" : "working",
    activity: "",
    lastMessage: "",
    agentId: "",
    lastAt: Date.now(),
  };
}

function teammate(s, name) {
  if (!name) return null;
  let agent = s.agents.get(`tm:${name}`);
  if (!agent) {
    agent = newAgent(`tm:${name}`, name, "teammate");
    s.agents.set(agent.key, agent);
  }
  return agent;
}

// Link a hook agent_id to a named teammate, folding in any anonymous entry
// recorded for that id before its name was known.
function linkAgentId(s, agentId, agent) {
  if (!agentId || !agent) return;
  const previous = s.agentIds.get(agentId);
  if (previous && previous !== agent.key) {
    const anon = s.agents.get(previous);
    if (anon?.kind === "subagent") {
      if (anon.lastAt >= agent.lastAt || !agent.activity) {
        agent.status = anon.status;
        agent.activity = anon.activity;
        agent.lastAt = anon.lastAt;
      }
      if (!agent.role || agent.role === "general-purpose") agent.role = anon.role || agent.role;
      s.agents.delete(previous);
    }
  }
  s.agentIds.set(agentId, agent.key);
  agent.agentId = agentId;
}

function actorFor(s, ev) {
  if (!ev.agent_id) return s.agents.get("lead");
  const key = s.agentIds.get(ev.agent_id);
  if (key && s.agents.has(key)) return s.agents.get(key);
  for (const agent of s.agents.values()) {
    if (agent.agentId && (agent.agentId === ev.agent_id || agent.agentId.startsWith(`${ev.agent_id}@`))) {
      s.agentIds.set(ev.agent_id, agent.key);
      return agent;
    }
  }
  // Teammate ids look like "name@team"; match them before the config is read.
  const at = ev.agent_id.indexOf("@");
  const named = at > 0 ? s.agents.get(`tm:${ev.agent_id.slice(0, at)}`) : null;
  if (named) {
    linkAgentId(s, ev.agent_id, named);
    return named;
  }
  const agent = newAgent(`sa:${ev.agent_id}`, ev.agent_type || "helper", "subagent");
  agent.role = ev.agent_type || "";
  agent.agentId = ev.agent_id;
  s.agents.set(agent.key, agent);
  s.agentIds.set(ev.agent_id, agent.key);
  return agent;
}

function addFeed(s, who, kind, text) {
  s.feed.push({ id: nextId++, at: Date.now(), who, kind, text: clip(text, 600) });
  if (s.feed.length > FEED_LIMIT) s.feed.splice(0, s.feed.length - FEED_LIMIT);
}

function upsertTask(s, id, patch) {
  if (!id) return null;
  const key = String(id);
  const task = s.tasks.get(key) || { id: key, subject: "", description: "", status: "pending", owner: "", blockedBy: [] };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined && v !== null && v !== "") task[k] = v;
  s.tasks.set(key, task);
  return task;
}

// ---------------------------------------------------------------------------
// Hook events

function ingest(ev) {
  if (!ev || typeof ev.session_id !== "string" || !ev.hook_event_name) return;
  const s = getSession(ev.session_id, ev.cwd);
  s.lastEventAt = Date.now();
  if (ev.teammate_name && ev.agent_id) linkAgentId(s, ev.agent_id, teammate(s, ev.teammate_name));
  const actor = actorFor(s, ev);
  actor.lastAt = Date.now();

  switch (ev.hook_event_name) {
    case "SessionStart":
      s.ended = false;
      if (!ev.agent_id) {
        actor.status = "idle";
        actor.model = ev.model || actor.model;
        addFeed(s, actor.name, "system", `Session ${ev.source === "resume" ? "resumed" : "started"} in ${ev.cwd || "?"}`);
      }
      break;
    case "SessionEnd":
      if (!ev.agent_id) {
        s.ended = true;
        for (const agent of s.agents.values()) agent.status = "offline";
        addFeed(s, "Office", "system", "Session ended");
        releaseListener(s, { ended: true });
      }
      break;
    case "UserPromptSubmit":
      actor.status = "working";
      actor.activity = "Reading your request";
      addFeed(s, "You", "prompt", ev.prompt || "");
      break;
    case "PreToolUse":
      actor.status = "working";
      actor.activity = describeTool(ev.tool_name, ev.tool_input || {});
      trackToolCall(s, actor, ev.tool_name, ev.tool_input || {});
      break;
    case "PostToolUse":
      if (actor.status !== "offline") actor.status = "working";
      break;
    case "PostToolUseFailure":
      addFeed(s, actor.name, "error", `${ev.tool_name || "Tool"} failed${ev.error ? `: ${ev.error}` : ""}`);
      break;
    case "Notification":
      if (ev.notification_type === "permission_prompt") {
        actor.status = "waiting";
        actor.activity = ev.message || "Waiting for your approval";
        addFeed(s, actor.name, "alert", ev.message || "Needs your approval");
      } else if (ev.notification_type === "idle_prompt") {
        actor.status = "idle";
      }
      break;
    case "Stop":
      actor.status = "idle";
      actor.activity = "";
      if (ev.last_assistant_message) {
        actor.lastMessage = clip(ev.last_assistant_message, 600);
        addFeed(s, actor.name, "reply", ev.last_assistant_message);
      }
      break;
    case "SubagentStart":
      actor.status = "working";
      actor.role ||= ev.agent_type || "";
      if (actor.kind === "subagent") addFeed(s, actor.name, "system", `${ev.agent_type || "Helper"} started`);
      break;
    case "SubagentStop":
      actor.status = actor.kind === "subagent" ? "done" : "idle";
      actor.activity = "";
      if (ev.last_assistant_message) {
        actor.lastMessage = clip(ev.last_assistant_message, 600);
        addFeed(s, actor.name, "reply", ev.last_assistant_message);
      }
      break;
    case "TeammateIdle": {
      const tm = teammate(s, ev.teammate_name) || actor;
      tm.status = "idle";
      tm.activity = "";
      tm.lastAt = Date.now();
      addFeed(s, tm.name, "idle", "Finished and is waiting for work");
      break;
    }
    case "TaskCreated":
      upsertTask(s, ev.task_id, { subject: ev.task_subject, description: ev.task_description });
      addFeed(s, ev.teammate_name || actor.name, "task", `Created task: ${ev.task_subject || ev.task_id}`);
      break;
    case "TaskCompleted":
      upsertTask(s, ev.task_id, {
        subject: ev.task_subject,
        description: ev.task_description,
        status: "completed",
        owner: ev.teammate_name,
      });
      addFeed(s, ev.teammate_name || actor.name, "done", `Completed: ${ev.task_subject || ev.task_id}`);
      break;
  }
  broadcast();
}

function trackToolCall(s, actor, tool, input) {
  if (tool === "SendMessage") {
    const to = input.to || input.recipient || input.name || "teammate";
    const text = input.message || input.content || input.summary || "";
    addFeed(s, actor.name, "message", `→ ${to}: ${typeof text === "string" ? text : JSON.stringify(text)}`);
  } else if (tool === "Agent" || tool === "Task") {
    if (input.name) {
      const tm = teammate(s, input.name);
      tm.status = "working";
      tm.activity = "Joining the team";
      tm.role = input.subagent_type || tm.role || "general-purpose";
      tm.model = input.model || tm.model;
      addFeed(s, actor.name, "hire", `Brought in ${input.name}${input.subagent_type ? ` (${input.subagent_type})` : ""}`);
    }
  } else if (tool === "TaskUpdate") {
    upsertTask(s, input.taskId || input.task_id || input.id, { status: input.status, owner: input.owner });
  }
}

function describeTool(tool, input) {
  const file = (p) => (p ? path.basename(String(p)) : "a file");
  switch (tool) {
    case "Bash":
      return input.description ? clip(input.description, 80) : `Running ${clip(input.command || "a command", 80)}`;
    case "Edit":
    case "MultiEdit":
    case "Write":
    case "NotebookEdit":
      return `Editing ${file(input.file_path || input.notebook_path)}`;
    case "Read":
      return `Reading ${file(input.file_path)}`;
    case "Grep":
    case "Glob":
      return `Searching for ${clip(input.pattern || "files", 60)}`;
    case "WebSearch":
      return `Searching the web: ${clip(input.query || "", 60)}`;
    case "WebFetch":
      return "Reading a web page";
    case "Agent":
    case "Task":
      return input.name ? `Bringing in ${input.name}` : `Delegating: ${clip(input.description || "a subtask", 60)}`;
    case "SendMessage":
      return `Messaging ${input.to || input.recipient || "a teammate"}`;
    case "TaskCreate":
      return `Creating task: ${clip(input.subject || "", 60)}`;
    case "TaskUpdate":
      return "Updating the task list";
    case "TaskList":
    case "TaskGet":
      return "Checking the task list";
    case "TodoWrite":
      return "Planning next steps";
    default:
      return `Using ${tool || "a tool"}`;
  }
}

// ---------------------------------------------------------------------------
// Team config and task list written by Claude Code

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function refreshFromDisk(s) {
  const config = readJson(path.join(CLAUDE_DIR, "teams", s.teamName, "config.json"));
  if (config && Array.isArray(config.members)) {
    const present = new Set();
    for (const m of config.members) {
      const type = m.agentType || m.agent_type || "";
      if (type === "team-lead") continue;
      if (!m.name) continue;
      const tm = teammate(s, m.name);
      present.add(tm.key);
      tm.role = type || tm.role || "general-purpose";
      tm.model = m.model || tm.model;
      linkAgentId(s, m.agentId || m.agent_id || m.id, tm);
      if (tm.status === "left") tm.status = "idle";
    }
    for (const agent of s.agents.values()) {
      if (s.inConfig.has(agent.key) && !present.has(agent.key) && agent.status !== "left") {
        agent.status = "left";
        agent.activity = "";
        addFeed(s, agent.name, "system", "Left the team");
      }
    }
    for (const key of present) s.inConfig.add(key);
  }

  const taskDir = path.join(CLAUDE_DIR, "tasks", s.teamName);
  let files = [];
  try {
    files = fs.readdirSync(taskDir).filter((f) => f.endsWith(".json"));
  } catch {
    return;
  }
  for (const f of files) {
    const t = readJson(path.join(taskDir, f));
    if (!t || typeof t !== "object") continue;
    upsertTask(s, t.id ?? path.basename(f, ".json"), {
      subject: t.subject || t.title,
      description: t.description,
      status: t.status,
      owner: t.owner,
      blockedBy: Array.isArray(t.blockedBy) ? t.blockedBy.map(String) : undefined,
    });
  }
}

let lastDiskSignature = "";
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    const stale = s.ended ? now - s.lastEventAt > 3_600_000 : now - s.lastEventAt > 12 * 3_600_000;
    if (stale) {
      releaseListener(s, { ended: true });
      sessions.delete(id);
      continue;
    }
    if (!s.ended) refreshFromDisk(s);
  }
  const signature = JSON.stringify(snapshot().sessions.map((s) => [s.agents, s.tasks, s.listening]));
  if (signature !== lastDiskSignature) {
    lastDiskSignature = signature;
    broadcast();
  }
}, 1500);

// ---------------------------------------------------------------------------
// Dashboard commands, delivered to the lead through its listening hook

function commandText(c) {
  const quote = (t) => `"""${String(t).trim()}"""`;
  switch (c.kind) {
    case "hire": {
      let text = `Spawn an agent-team teammate named "${c.name}"`;
      if (c.role && c.role !== "general-purpose") text += ` using the "${c.role}" agent type`;
      if (c.model && c.model !== "inherit") text += `, running on ${c.model}`;
      text += c.brief
        ? `. Use exactly that name. Its spawn prompt: ${quote(c.brief)}`
        : ". Use exactly that name. Tell it to pick up tasks from the shared task list and report back to you.";
      return text;
    }
    case "task": {
      let text = `Add a task to the team's shared task list with the subject "${c.subject}"`;
      if (c.description) text += ` and this description: ${quote(c.description)}`;
      text += c.assignee
        ? `. Assign it to teammate "${c.assignee}" (make them the owner) and message them so they start on it.`
        : ". Leave it unassigned so the next free teammate claims it.";
      return text;
    }
    case "message":
      return `Send teammate "${c.to}" this message from me: ${quote(c.text)}`;
    case "shutdown":
      return `Ask teammate "${c.name}" to shut down gracefully.`;
    case "lead":
      return String(c.text).trim();
  }
  return "";
}

function validateCommand(c, s) {
  const short = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
  const optional = (v, max) => v === undefined || v === "" || (typeof v === "string" && v.length <= max);
  switch (c.kind) {
    case "hire":
      if (!NAME_RE.test(c.name || "")) return "Use a short name: letters, numbers, - or _.";
      if ([...s.agents.values()].some((a) => a.kind === "teammate" && a.name === c.name && a.status !== "left"))
        return `There is already a teammate named ${c.name}.`;
      if (!optional(c.role, 64) || (c.role && !NAME_RE.test(c.role))) return "Unknown role.";
      if (!MODELS.has(c.model || "")) return "Unknown model.";
      return optional(c.brief, 6000) ? null : "The brief is too long.";
    case "task":
      if (!short(c.subject, 200)) return "Give the task a subject.";
      if (!optional(c.description, 6000)) return "The description is too long.";
      return !c.assignee || NAME_RE.test(c.assignee) ? null : "Unknown teammate.";
    case "message":
      if (!NAME_RE.test(c.to || "")) return "Pick a teammate.";
      return short(c.text, 6000) ? null : "Write a message.";
    case "shutdown":
      return NAME_RE.test(c.name || "") ? null : "Pick a teammate.";
    case "lead":
      return short(c.text, 6000) ? null : "Write a message for the lead.";
  }
  return "Unknown command.";
}

function deliverQueued(s) {
  const pending = s.queue.filter((c) => c.status === "queued");
  if (!pending.length || !s.listener?.res) return;
  const lines = pending.map((c, i) => `${i + 1}. ${c.text}`).join("\n");
  const message =
    "[Agent Office] The user sent these requests from their Agent Office dashboard, " +
    "a local tool they run next to this session. They are the user's own instructions " +
    `to you as team lead; carry them out in order:\n${lines}\n`;
  for (const c of pending) {
    c.status = "delivered";
    c.deliveredAt = Date.now();
  }
  addFeed(s, "You", "command", `Sent to the lead: ${pending.map((c) => c.label).join("; ")}`);
  releaseListener(s, { message });
  s.listener = null; // The hook exits after delivering; the next Stop re-arms it.
  broadcast();
}

function releaseListener(s, payload) {
  const l = s.listener;
  if (!l?.res) return;
  clearTimeout(l.timer);
  const res = l.res;
  l.res = null;
  sendJson(res, 200, payload);
}

function handleListen(req, res, url) {
  const id = url.searchParams.get("session") || "";
  const listener = url.searchParams.get("listener") || "";
  const started = Number(url.searchParams.get("started")) || 0;
  if (!id || !listener) return sendJson(res, 400, { error: "missing session" });
  const s = getSession(id, url.searchParams.get("cwd") || "");
  if (s.ended) return sendJson(res, 200, { ended: true });

  const current = s.listener;
  if (current && current.id !== listener) {
    if (current.started > started) return sendJson(res, 200, { superseded: true });
    releaseListener(s, { superseded: true });
  }
  if (!current || current.id !== listener) s.listener = { id: listener, started, res: null, timer: null, lastPollAt: 0 };
  const l = s.listener;
  if (l.res) {
    clearTimeout(l.timer);
    sendJson(l.res, 200, {});
  }
  l.res = res;
  l.lastPollAt = Date.now();
  l.timer = setTimeout(() => {
    if (l.res === res) {
      l.res = null;
      sendJson(res, 200, {});
    }
  }, POLL_HOLD_MS);
  req.on("close", () => {
    if (l.res === res) {
      clearTimeout(l.timer);
      l.res = null;
    }
  });
  deliverQueued(s);
}

// ---------------------------------------------------------------------------
// Roles: subagent definitions teammates can be spawned from

function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const meta = {};
  if (!match) return meta;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return meta;
}

function listRoles(cwd) {
  const roles = [];
  const dirs = [
    ["project", cwd ? path.join(cwd, ".claude", "agents") : null],
    ["user", path.join(CLAUDE_DIR, "agents")],
  ];
  for (const [scope, dir] of dirs) {
    if (!dir) continue;
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }
    for (const f of files) {
      let meta = {};
      try {
        meta = parseFrontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch {
        continue;
      }
      const name = meta.name || path.basename(f, ".md");
      if (roles.some((r) => r.name === name)) continue;
      roles.push({ name, description: meta.description || "", model: meta.model || "", scope });
    }
  }
  return roles;
}

function createRole(s, body) {
  const name = String(body.name || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(name)) return [400, "Use a lowercase name with letters, numbers and dashes."];
  const description = String(body.description || "").replace(/\s+/g, " ").trim();
  if (!description || description.length > 300) return [400, "Describe the role in one line (up to 300 characters)."];
  const instructions = String(body.instructions || "").trim();
  if (!instructions || instructions.length > 8000) return [400, "Write the role's instructions."];
  const model = String(body.model || "inherit");
  if (!MODELS.has(model)) return [400, "Unknown model."];
  const tools = String(body.tools || "").trim();
  if (tools && !/^[\w ,.*()-]+$/.test(tools)) return [400, "List tools separated by commas, e.g. Read, Grep, Glob."];
  if (!s.cwd) return [400, "This session hasn't reported its project folder yet."];

  const dir = path.join(s.cwd, ".claude", "agents");
  const file = path.join(dir, `${name}.md`);
  if (fs.existsSync(file)) return [409, `${name}.md already exists in ${dir}.`];
  const lines = ["---", `name: ${name}`, `description: ${JSON.stringify(description)}`, `model: ${model || "inherit"}`];
  if (tools) lines.push(`tools: ${tools}`);
  lines.push("---", "", instructions, "");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, lines.join("\n"));
  addFeed(s, "You", "system", `Created role ${name} in .claude/agents/`);
  return [201, file];
}

// ---------------------------------------------------------------------------
// Snapshot streamed to the browser

function snapshot() {
  const now = Date.now();
  const list = [...sessions.values()]
    .sort((a, b) => b.lastEventAt - a.lastEventAt)
    .map((s) => ({
      id: s.id,
      cwd: s.cwd,
      project: s.cwd ? path.basename(s.cwd) : s.id.slice(0, 8),
      teamName: s.teamName,
      startedAt: s.startedAt,
      lastEventAt: s.lastEventAt,
      ended: s.ended,
      listening: !!s.listener && now - s.listener.lastPollAt < LISTENING_GRACE_MS,
      agents: [...s.agents.values()],
      tasks: [...s.tasks.values()],
      feed: s.feed.slice(-150),
      queue: s.queue.slice(-30),
    }));
  return { now, sessions: list };
}

let broadcastTimer = null;
function broadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    const data = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const res of streams) res.write(data);
  }, 150);
}

// ---------------------------------------------------------------------------
// HTTP

function sendJson(res, status, body) {
  if (res.headersSent || res.writableEnded) return;
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function clip(text, max) {
  const t = String(text ?? "").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const STATIC = {
  "/office.css": ["office.css", "text/css; charset=utf-8"],
  "/office.js": ["office.js", "text/javascript; charset=utf-8"],
};

const server = http.createServer(async (req, res) => {
  // Only answer requests addressed to this machine by name (blocks DNS rebinding).
  const host = String(req.headers.host || "");
  if (host !== `${HOST}:${PORT}` && host !== `localhost:${PORT}`) {
    res.writeHead(421).end("Misdirected request");
    return;
  }
  const url = new URL(req.url || "/", `http://${host}`);
  const headers = { "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };

  if (req.method === "GET" && url.pathname === "/") {
    const html = fs.readFileSync(path.join(UI_DIR, "index.html"), "utf8").replace("__OFFICE_TOKEN__", TOKEN);
    res.writeHead(200, {
      ...headers,
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
    });
    res.end(html);
    return;
  }
  if (req.method === "GET" && STATIC[url.pathname]) {
    const [file, type] = STATIC[url.pathname];
    res.writeHead(200, { ...headers, "content-type": type, "cache-control": "no-store" });
    res.end(fs.readFileSync(path.join(UI_DIR, file)));
    return;
  }

  if (!url.pathname.startsWith("/api/")) {
    res.writeHead(404, headers).end("Not found");
    return;
  }
  const token = req.headers["x-office-token"] || url.searchParams.get("token");
  if (token !== TOKEN) return sendJson(res, 401, { error: "bad token" });
  const origin = req.headers.origin;
  if (origin && origin !== `http://${host}`) return sendJson(res, 403, { error: "cross-origin request" });

  try {
    if (req.method === "POST" && url.pathname === "/api/hook") {
      ingest(await readBody(req));
      return sendJson(res, 200, {});
    }
    if (req.method === "GET" && url.pathname === "/api/listen") return handleListen(req, res, url);
    if (req.method === "GET" && url.pathname === "/api/stream") {
      res.writeHead(200, { ...headers, "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(`retry: 2000\ndata: ${JSON.stringify(snapshot())}\n\n`);
      streams.add(res);
      const ping = setInterval(() => res.write(": ping\n\n"), 20_000);
      req.on("close", () => {
        clearInterval(ping);
        streams.delete(res);
      });
      return;
    }

    const s = sessions.get(url.searchParams.get("session") || "");
    if (!s) return sendJson(res, 404, { error: "That session isn't in the office any more." });

    if (req.method === "POST" && url.pathname === "/api/command") {
      const body = await readBody(req);
      const problem = validateCommand(body, s);
      if (problem) return sendJson(res, 400, { error: problem });
      if (s.ended) return sendJson(res, 409, { error: "This session has ended." });
      const command = {
        id: nextId++,
        kind: body.kind,
        label: clip(body.label || body.kind, 120),
        text: commandText(body),
        status: "queued",
        createdAt: Date.now(),
      };
      s.queue.push(command);
      deliverQueued(s);
      broadcast();
      return sendJson(res, 201, { command });
    }
    if (req.method === "DELETE" && url.pathname === "/api/command") {
      const id = Number(url.searchParams.get("id"));
      const command = s.queue.find((c) => c.id === id && c.status === "queued");
      if (!command) return sendJson(res, 404, { error: "That command was already sent." });
      command.status = "cancelled";
      broadcast();
      return sendJson(res, 200, {});
    }
    if (req.method === "GET" && url.pathname === "/api/roles") return sendJson(res, 200, { roles: listRoles(s.cwd) });
    if (req.method === "POST" && url.pathname === "/api/roles") {
      const [status, result] = createRole(s, await readBody(req));
      broadcast();
      return sendJson(res, status, status < 300 ? { file: result } : { error: result });
    }
    return sendJson(res, 404, { error: "not found" });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || "bad request" });
  }
});

server.on("error", (err) => {
  console.error(err.code === "EADDRINUSE" ? `Port ${PORT} is busy. Set AGENT_OFFICE_PORT to use another.` : err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  writeServerInfo(PORT);
  console.log(`Agent Office is open at http://localhost:${PORT}`);
});
