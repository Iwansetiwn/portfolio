# Agent Office

A live office view of your Claude Code [agent team](https://code.claude.com/docs/en/agent-teams).
Each teammate sits at a desk and shows what it's doing right now, and you can hire teammates,
hand out tasks, message them and send them home from the browser.

It is a separate local tool and isn't part of the portfolio site: plain Node.js (20+), no extra
dependencies, and it only listens on `127.0.0.1`.

## Set up (once)

```bash
npm run office:install
```

This adds the Agent Office hooks to your user settings (`~/.claude/settings.json`) and turns on
agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). A backup of the file is saved next to it as
`settings.json.bak-agent-office`.

- Only one project: `node agent-office/install.mjs --project /path/to/project` writes to that
  project's `.claude/settings.local.json` instead.
- Agent teams already configured your own way: add `--no-teams`.
- Remove it again: `npm run office:uninstall`.

The hooks call `node` with an absolute path to `agent-office/hook.mjs`, so keep this folder where
it is (or re-run the installer after moving it).

## Use it

1. Start the office: `npm run office`, then open <http://localhost:4317>.
2. Start (or restart) Claude Code in your project: `claude`. Use an interactive session; agent
   teams don't run with `claude -p`.
3. Your session appears in the office as the **Lead**. From there:

| To | Do |
| --- | --- |
| Hire a teammate | **Hire** tab: name, role, model and a brief. |
| Create a reusable role | **Roles** tab. Saved as a subagent file in the project's `.claude/agents/`. |
| Add a task | **Tasks** tab, or click a teammate and use **Give a task**. |
| Message a teammate | Click its desk. |
| Talk to the lead | **Tell the lead** box under the office floor. |
| Send a teammate home | Click its desk, then **Ask to shut down**. |
| See what happened | **Activity** tab. |

The pill in the top bar shows whether the lead can receive commands right now:

- **Lead is listening**: commands are delivered immediately.
- **Lead is busy**: commands wait in the queue until the lead finishes its current turn. You can
  cancel a queued command.
- **Lead not connected**: type anything in the lead's terminal to reconnect it.

Permission prompts still appear in the lead's terminal. The lead's desk shows **Needs you** when
one is waiting.

## How it works

```
Claude Code (lead + teammates)
  │  hooks: hook.mjs event  ──────────────►  server.mjs  ──SSE──►  browser (ui/)
  │  hook:  hook.mjs listen ◄── long-poll ──     ▲                    │
  ▼                                              │                    │
~/.claude/teams/<team>/config.json  ─────────────┤  ◄── commands ─────┘
~/.claude/tasks/<team>/             ─────────────┘
```

- **Live view.** Async hooks (they never slow Claude down) forward session, tool, subagent,
  teammate and task events to the local server. The server also reads the team config and task
  list that Claude Code keeps under `~/.claude`, and streams one combined picture to the browser.
- **Commands.** The dashboard never edits Claude Code's internal files. Each command is turned
  into a plain instruction for the lead (for example "Spawn a teammate named …") and handed over
  by a `SessionStart`/`Stop` hook with `asyncRewake`. That hook waits in the background and, when
  a command arrives, exits with code 2, which wakes the lead with the instruction. The lead then
  uses its own tools to spawn teammates, create tasks or send messages, exactly as if you had
  typed it.
- **Security.** The server binds to `127.0.0.1`, rejects requests addressed to any other host
  name (DNS rebinding) or coming from another origin, and requires a random token stored in
  `~/.claude/agent-office/token` (mode 600). Only the hook and pages served by the office know it.

## Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `AGENT_OFFICE_PORT` | `4317` | Port for the server. The hook finds it automatically. |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Where Claude Code keeps team and task files. |

## Limits

- Agent teams are experimental in Claude Code, and the team config and task file formats aren't
  a public API. The office reads them defensively and falls back to hook events; if a Claude Code
  update changes them, desks may show fewer details until this tool is updated.
- One team per lead session (a Claude Code limit). With several sessions running, pick one from
  the session menu.
- The office keeps history in memory, so restarting the server clears the activity feed. Team
  members and tasks are re-read from disk.
