#!/usr/bin/env node
// Adds (or removes) the Agent Office hooks in a Claude Code settings file.
//
//   node agent-office/install.mjs                     ~/.claude/settings.json
//   node agent-office/install.mjs --project <dir>     <dir>/.claude/settings.local.json
//   node agent-office/install.mjs --uninstall [...]   remove the hooks again
//   --no-teams                                        don't turn on agent teams
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureToken } from "./config.mjs";

const HOOK_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "hook.mjs");
const MARKER = "agent-office/hook.mjs";

// Events forwarded to the dashboard. Tool events need a matcher.
const FORWARDED = {
  SessionStart: null,
  UserPromptSubmit: null,
  PreToolUse: "*",
  PostToolUse: "*",
  PostToolUseFailure: "*",
  Stop: null,
  SubagentStart: null,
  SubagentStop: null,
  TeammateIdle: null,
  TaskCreated: null,
  TaskCompleted: null,
  Notification: null,
};

const args = process.argv.slice(2);
const uninstall = args.includes("--uninstall");
const projectIdx = args.indexOf("--project");
const settingsFile =
  projectIdx >= 0
    ? path.join(path.resolve(args[projectIdx + 1] || "."), ".claude", "settings.local.json")
    : path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "settings.json");

let settings = {};
if (fs.existsSync(settingsFile)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
  } catch (err) {
    console.error(`Could not parse ${settingsFile}: ${err.message}\nFix the file and run this again.`);
    process.exit(1);
  }
  fs.copyFileSync(settingsFile, `${settingsFile}.bak-agent-office`);
}

settings.hooks = removeOurHooks(settings.hooks || {});

if (!uninstall) {
  const hook = (mode, extra = {}) => ({
    type: "command",
    command: "node",
    args: [HOOK_SCRIPT, mode],
    ...extra,
  });
  for (const [event, matcher] of Object.entries(FORWARDED)) {
    const entry = { hooks: [hook("event", { async: true })] };
    if (matcher) entry.matcher = matcher;
    (settings.hooks[event] ||= []).push(entry);
  }
  // SessionEnd hooks can't run in the background; keep them short instead.
  (settings.hooks.SessionEnd ||= []).push({ hooks: [hook("event", { timeout: 3 })] });
  // The lead listens for dashboard commands whenever it starts or finishes a turn.
  for (const event of ["SessionStart", "Stop"]) {
    settings.hooks[event].push({ hooks: [hook("listen", { asyncRewake: true, timeout: 86400 })] });
  }
  if (!args.includes("--no-teams")) {
    settings.env = { ...settings.env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" };
  }
  ensureToken();
}

if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
fs.writeFileSync(settingsFile, `${JSON.stringify(settings, null, 2)}\n`);

if (uninstall) {
  console.log(`Removed the Agent Office hooks from ${settingsFile}.`);
  console.log("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS was left as it is; remove it from \"env\" to turn agent teams off.");
} else {
  console.log(`Installed the Agent Office hooks in ${settingsFile}.`);
  console.log("Next: start the dashboard with `npm run office`, then restart Claude Code.");
}

function removeOurHooks(hooks) {
  const isOurs = (h) => (h.args || []).some((a) => String(a).replaceAll("\\", "/").endsWith(MARKER));
  const result = {};
  for (const [event, entries] of Object.entries(hooks)) {
    const kept = entries
      .map((entry) => ({ ...entry, hooks: (entry.hooks || []).filter((h) => !isOurs(h)) }))
      .filter((entry) => entry.hooks.length > 0);
    if (kept.length > 0) result[event] = kept;
  }
  return result;
}
