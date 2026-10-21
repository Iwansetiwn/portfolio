// Agent Office dashboard. Renders the snapshot streamed from server.mjs and
// sends dashboard commands back to it.
(() => {
  const TOKEN = document.querySelector('meta[name="office-token"]').content;
  const $ = (sel) => document.querySelector(sel);

  const state = {
    snap: null,
    sessionId: load("office.session"),
    connected: false,
    roles: [],
    rolesFor: null,
    openAgent: null,
  };

  const STATUS_TEXT = {
    working: "Working",
    idle: "Idle",
    waiting: "Needs you",
    done: "Done",
    left: "Left",
    offline: "Offline",
  };

  // ---------------------------------------------------------------- helpers

  function load(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage unavailable (private window); the choice just isn't remembered.
    }
  }

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  function field(form, name) {
    return form.elements.namedItem(name).value;
  }

  function hue(name) {
    let n = 0;
    for (const ch of name) n = (n * 31 + ch.charCodeAt(0)) % 360;
    return n;
  }

  function clock(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  let toastTimer;
  function toast(message, isError) {
    const el = $("#toast");
    el.textContent = message;
    el.className = `toast show${isError ? " error" : ""}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = "toast"), isError ? 5000 : 2500);
  }

  async function api(method, path, body) {
    const session = current();
    if (!session) throw new Error("No session selected.");
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${path}${sep}session=${encodeURIComponent(session.id)}`, {
      method,
      headers: { "content-type": "application/json", "x-office-token": TOKEN },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function command(body, successText) {
    try {
      const { command } = await api("POST", "/api/command", body);
      toast(command.status === "delivered" ? successText : "Queued: the lead gets it as soon as it's free");
      return true;
    } catch (err) {
      toast(err.message, true);
      return false;
    }
  }

  function current() {
    const list = state.snap?.sessions || [];
    return list.find((s) => s.id === state.sessionId) || list.find((s) => !s.ended) || list[0] || null;
  }

  function teammates(session) {
    return (session?.agents || []).filter((a) => a.kind === "teammate");
  }

  function activeTeammates(session) {
    return teammates(session).filter((a) => a.status !== "left" && a.status !== "offline");
  }

  // ---------------------------------------------------------------- stream

  function connect() {
    const es = new EventSource(`/api/stream?token=${encodeURIComponent(TOKEN)}`);
    es.onopen = () => {
      state.connected = true;
      renderPills();
    };
    es.onmessage = (e) => {
      state.connected = true;
      state.snap = JSON.parse(e.data);
      render();
    };
    es.onerror = () => {
      state.connected = false;
      renderPills();
    };
  }

  // ---------------------------------------------------------------- render

  function render() {
    const session = current();
    if (session && session.id !== state.sessionId) {
      state.sessionId = session.id;
      save("office.session", session.id);
    }
    renderSessions();
    renderPills();
    $("#empty").hidden = !!session;
    $("#floor").hidden = !session;
    for (const form of document.querySelectorAll("form:not([method=dialog])")) {
      for (const el of form.elements) el.disabled = !session || session.ended;
    }
    if (!session) return;

    $("#project-name").textContent = session.project;
    $("#project-name").title = session.cwd;
    renderFloor(session);
    renderQueue(session);
    renderBoard(session);
    renderFeed(session);
    renderTeammateSelects(session);
    if (state.rolesFor !== session.id) refreshRoles();
    if (state.openAgent) renderAgentDetail(session);
  }

  function renderSessions() {
    const select = $("#session-select");
    const list = state.snap?.sessions || [];
    const signature = list.map((s) => `${s.id}:${s.ended}`).join("|");
    if (select.dataset.signature !== signature) {
      select.dataset.signature = signature;
      select.replaceChildren(
        ...list.map((s) =>
          h("option", { value: s.id, text: `${s.project} · ${s.id.slice(0, 8)}${s.ended ? " (ended)" : ""}` }),
        ),
      );
      if (!list.length) select.append(h("option", { text: "Waiting for a session…" }));
    }
    select.value = state.sessionId || "";
    select.disabled = !list.length;
  }

  function renderPills() {
    const conn = $("#conn-pill");
    conn.className = `pill ${state.connected ? "ok" : "bad"}`;
    conn.textContent = state.connected ? "Live" : "Reconnecting…";

    const lead = $("#lead-pill");
    const session = current();
    const leadAgent = session?.agents.find((a) => a.kind === "lead");
    if (!session) {
      lead.hidden = true;
      return;
    }
    lead.hidden = false;
    if (session.ended) {
      lead.className = "pill";
      lead.textContent = "Session ended";
    } else if (session.listening) {
      lead.className = "pill ok";
      lead.textContent = "Lead is listening";
      lead.title = "Commands you send reach the lead right away.";
    } else if (leadAgent?.status === "working" || leadAgent?.status === "waiting") {
      lead.className = "pill warn";
      lead.textContent = "Lead is busy";
      lead.title = "Commands are queued and delivered when the lead finishes its current turn.";
    } else {
      lead.className = "pill bad";
      lead.textContent = "Lead not connected";
      lead.title = "Send any message in the lead's terminal to reconnect it.";
    }
  }

  // Desks are updated in place so their animations don't restart every tick.
  const desks = new Map();

  function deskFor(agent) {
    let desk = desks.get(agent.key);
    if (!desk) {
      const el = h(
        "button",
        { type: "button", class: "desk", onclick: () => openAgent(agent.key) },
        h("div", { class: "bubble" }),
        h(
          "div",
          { class: "scene", "aria-hidden": "true" },
          h("div", { class: "marker" }),
          h(
            "div",
            { class: "person" },
            h("div", { class: "chair" }),
            h("div", { class: "body" }),
            h("div", { class: "head" }),
            h("div", { class: "hair" }),
            h("div", { class: "arm" }),
          ),
          h("div", { class: "monitor" }, h("div", { class: "screen" })),
          h("div", { class: "mug" }),
          h("div", { class: "table" }),
        ),
        h("div", { class: "plate" }, h("strong", { class: "name" }), h("span", { class: "role" })),
        h("div", { class: "meta" }, h("span", { class: "dot" }), h("span", { class: "status" }), h("span", { class: "task" })),
      );
      el.style.setProperty("--hue", String(hue(agent.name)));
      desk = { el, key: "" };
      desks.set(agent.key, desk);
    }
    return desk;
  }

  function updateDesk(desk, agent, session) {
    const el = desk.el;
    const task = session.tasks.find((t) => t.owner === agent.name && t.status === "in_progress");
    const key = [agent.status, agent.activity, agent.name, agent.role, agent.model, task?.subject].join("|");
    if (desk.key === key) return;
    desk.key = key;
    el.dataset.status = agent.status;
    const bubble =
      agent.activity ||
      (agent.status === "idle" ? "Waiting for work" : agent.status === "left" ? "Left the office" : STATUS_TEXT[agent.status] || "");
    el.querySelector(".bubble").textContent = bubble;
    el.querySelector(".name").textContent = agent.kind === "lead" ? "Lead" : agent.name;
    el.querySelector(".role").textContent = [agent.role && agent.role !== "team-lead" ? agent.role : "", agent.model]
      .filter(Boolean)
      .join(" · ");
    el.querySelector(".dot").className = `dot ${agent.status}`;
    el.querySelector(".status").textContent = STATUS_TEXT[agent.status] || agent.status;
    el.querySelector(".task").textContent = task ? `· ${task.subject}` : "";
    el.setAttribute("aria-label", `${agent.kind === "lead" ? "Lead" : agent.name}: ${STATUS_TEXT[agent.status] || ""}. ${bubble}`);
  }

  function renderFloor(session) {
    const seen = new Set();
    const place = (container, list) => {
      list.forEach((agent, i) => {
        const desk = deskFor(agent);
        seen.add(agent.key);
        updateDesk(desk, agent, session);
        if (container.children[i] !== desk.el) container.insertBefore(desk.el, container.children[i] || null);
      });
      while (container.children.length > list.length) container.lastElementChild.remove();
    };

    const lead = session.agents.filter((a) => a.kind === "lead");
    const order = { working: 0, waiting: 0, idle: 1, done: 2, left: 3, offline: 3 };
    const team = teammates(session).sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
    const recent = Date.now() - 10 * 60_000;
    const helpers = session.agents
      .filter((a) => a.kind === "subagent" && (a.status === "working" || a.lastAt > recent))
      .slice(-8);

    place($("#lead-room"), lead);
    place($("#desks"), team);
    place($("#contractors"), helpers);
    $("#contractors-wrap").hidden = helpers.length === 0;

    for (const key of desks.keys()) if (!seen.has(key)) desks.delete(key);
    $("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderQueue(session) {
    const items = session.queue.filter((c) => c.status === "queued" || Date.now() - (c.deliveredAt || 0) < 60_000);
    $("#queue").replaceChildren(
      ...items.map((c) =>
        h(
          "div",
          { class: "queue-item", "data-status": c.status },
          h("span", { class: "label", text: c.label, title: c.text }),
          h("span", {
            class: "state",
            text: c.status === "queued" ? "Waiting for the lead" : c.status === "delivered" ? "Sent to the lead" : "Cancelled",
          }),
          c.status === "queued"
            ? h("button", {
                class: "btn ghost small",
                type: "button",
                text: "Cancel",
                onclick: async () => {
                  try {
                    await api("DELETE", `/api/command?id=${c.id}`);
                  } catch (err) {
                    toast(err.message, true);
                  }
                },
              })
            : null,
        ),
      ),
    );
  }

  function renderBoard(session) {
    const columns = [
      ["Pending", (t) => t.status !== "in_progress" && t.status !== "completed"],
      ["In progress", (t) => t.status === "in_progress"],
      ["Done", (t) => t.status === "completed"],
    ];
    const done = new Set(session.tasks.filter((t) => t.status === "completed").map((t) => t.id));
    $("#board").replaceChildren(
      ...columns.map(([title, match]) => {
        const tasks = session.tasks.filter(match);
        return h(
          "section",
          { class: "column" },
          h("h3", {}, h("span", { text: title }), h("span", { text: String(tasks.length) })),
          h(
            "ul",
            {},
            tasks.length
              ? tasks.map((t) => {
                  const blocked = (t.blockedBy || []).filter((id) => !done.has(id));
                  return h(
                    "li",
                    { class: "task-card" },
                    h(
                      "details",
                      {},
                      h("summary", { text: t.subject || `Task ${t.id}` }),
                      t.description ? h("p", { text: t.description }) : null,
                    ),
                    h("span", { class: "owner", text: t.owner ? `@${t.owner}` : "Unassigned" }),
                    blocked.length ? h("span", { class: "owner blocked", text: ` · waiting on ${blocked.join(", ")}` }) : null,
                  );
                })
              : h("li", { class: "none", text: "Nothing here" }),
          ),
        );
      }),
    );
  }

  function feedItem(item) {
    return h(
      "li",
      { "data-kind": item.kind },
      h("time", { text: clock(item.at) }),
      h("div", {}, h("span", { class: "who", text: item.who }), h("span", { class: "text", text: item.text })),
    );
  }

  function renderFeed(session) {
    const feed = $("#feed");
    const items = session.feed.slice().reverse();
    if (feed.dataset.last === String(items[0]?.id ?? "none")) return;
    feed.dataset.last = String(items[0]?.id ?? "none");
    feed.replaceChildren(...(items.length ? items.map(feedItem) : [h("li", { class: "empty-row", text: "No activity yet." })]));
  }

  function renderTeammateSelects(session) {
    const names = activeTeammates(session).map((a) => a.name);
    for (const select of document.querySelectorAll("select[data-teammates]")) {
      const signature = names.join("|");
      if (select.dataset.signature === signature) continue;
      select.dataset.signature = signature;
      const value = select.value;
      select.replaceChildren(
        h("option", { value: "", text: "Anyone free" }),
        ...names.map((n) => h("option", { value: n, text: n })),
      );
      select.value = names.includes(value) ? value : "";
    }
  }

  // ---------------------------------------------------------------- roles

  async function refreshRoles() {
    const session = current();
    if (!session) return;
    state.rolesFor = session.id;
    try {
      state.roles = (await api("GET", "/api/roles")).roles;
    } catch {
      state.roles = [];
    }
    $("#role-select").replaceChildren(
      h("option", { value: "general-purpose", text: "General purpose" }),
      ...state.roles.map((r) => h("option", { value: r.name, text: r.name })),
    );
    $("#roles").replaceChildren(
      ...(state.roles.length
        ? state.roles.map((r) =>
            h(
              "div",
              { class: "role-item" },
              h("span", { class: "scope", text: [r.model, r.scope].filter(Boolean).join(" · ") }),
              h("strong", { text: r.name }),
              h("p", { text: r.description || "No description" }),
            ),
          )
        : [h("p", { class: "hint", text: "No roles yet. Roles are subagent files in .claude/agents/." })]),
    );
  }

  // ---------------------------------------------------------------- agent dialog

  function openAgent(key) {
    state.openAgent = key;
    const session = current();
    if (!session) return;
    renderAgentDetail(session);
    const dialog = $("#agent-dialog");
    if (!dialog.open) dialog.showModal();
  }

  function renderAgentDetail(session) {
    const agent = session.agents.find((a) => a.key === state.openAgent);
    if (!agent) {
      $("#agent-dialog").close();
      return;
    }
    const isLead = agent.kind === "lead";
    const isTeammate = agent.kind === "teammate" && agent.status !== "left" && agent.status !== "offline";
    const tasks = session.tasks.filter((t) => t.owner === agent.name);
    const name = isLead ? "Lead" : agent.name;
    const recent = session.feed.filter((f) => f.who === name || f.who === agent.name).slice(-12).reverse();

    $("#agent-detail").replaceChildren(
      h(
        "div",
        { class: "detail" },
        h("h2", { text: isLead ? "Team lead" : agent.name }),
        h("div", { class: "sub", text: isLead ? "Your main Claude Code session" : agent.kind === "teammate" ? "Teammate" : "Helper subagent" }),
        h(
          "dl",
          {},
          h("dt", { text: "Status" }),
          h("dd", { text: STATUS_TEXT[agent.status] || agent.status }),
          h("dt", { text: "Doing" }),
          h("dd", { text: agent.activity || "—" }),
          agent.role ? [h("dt", { text: "Role" }), h("dd", { text: agent.role })] : null,
          agent.model ? [h("dt", { text: "Model" }), h("dd", { text: agent.model })] : null,
          tasks.length
            ? [h("dt", { text: "Tasks" }), h("dd", { text: tasks.map((t) => `${t.subject} (${t.status})`).join("\n") })]
            : null,
          agent.lastMessage ? [h("dt", { text: "Last said" }), h("dd", { text: agent.lastMessage })] : null,
        ),
        recent.length ? h("ul", { class: "recent" }, recent.map((f) => h("li", { text: `${clock(f.at)}  ${f.text}` }))) : null,
      ),
    );
    $("#dm-form").hidden = !(isLead || isTeammate);
    $("#dm-label").textContent = isLead ? "Message the lead" : `Message ${agent.name}`;
    $("#assign-form").hidden = !isTeammate;
    $("#shutdown-btn").hidden = !isTeammate;
  }

  // ---------------------------------------------------------------- events

  function wire() {
    $("#session-select").addEventListener("change", (e) => {
      state.sessionId = e.target.value;
      save("office.session", state.sessionId);
      desks.clear();
      for (const id of ["#lead-room", "#desks", "#contractors"]) $(id).replaceChildren();
      render();
    });

    for (const tab of document.querySelectorAll("[role=tab]")) {
      tab.addEventListener("click", () => {
        for (const t of document.querySelectorAll("[role=tab]")) t.setAttribute("aria-selected", String(t === tab));
        for (const panel of document.querySelectorAll("[role=tabpanel]")) panel.hidden = panel.id !== `tab-${tab.dataset.tab}`;
        if (tab.dataset.tab === "roles" || tab.dataset.tab === "hire") refreshRoles();
        save("office.tab", tab.dataset.tab);
      });
    }
    const savedTab = load("office.tab");
    if (savedTab) document.querySelector(`[role=tab][data-tab="${savedTab}"]`)?.click();

    $("#lead-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = field(e.target, "text").trim();
      if (!text) return;
      if (await command({ kind: "lead", text, label: `To lead: ${text}` }, "Sent to the lead")) e.target.reset();
    });
    $("#lead-text").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("#lead-form").requestSubmit();
    });

    $("#task-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const body = {
        kind: "task",
        subject: field(f, "subject").trim(),
        description: field(f, "description").trim(),
        assignee: field(f, "assignee"),
      };
      body.label = `Task: ${body.subject}${body.assignee ? ` → ${body.assignee}` : ""}`;
      if (await command(body, "Task sent to the lead")) f.reset();
    });

    $("#hire-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const body = {
        kind: "hire",
        name: field(f, "name").trim(),
        role: field(f, "role"),
        model: field(f, "model"),
        brief: field(f, "brief").trim(),
      };
      body.label = `Hire ${body.name}${body.role !== "general-purpose" ? ` (${body.role})` : ""}`;
      if (await command(body, `Asked the lead to hire ${body.name}`)) f.reset();
    });

    $("#role-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api("POST", "/api/roles", {
          name: field(f, "name").trim(),
          description: field(f, "description").trim(),
          model: field(f, "model"),
          tools: field(f, "tools").trim(),
          instructions: field(f, "instructions").trim(),
        });
        toast(`Saved role ${field(f, "name").trim()}`);
        f.reset();
        refreshRoles();
      } catch (err) {
        toast(err.message, true);
      }
    });

    $("#dm-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const session = current();
      const agent = session?.agents.find((a) => a.key === state.openAgent);
      const text = field(e.target, "text").trim();
      if (!agent || !text) return;
      const body =
        agent.kind === "lead"
          ? { kind: "lead", text, label: `To lead: ${text}` }
          : { kind: "message", to: agent.name, text, label: `Message ${agent.name}: ${text}` };
      if (await command(body, "Message sent to the lead")) e.target.reset();
    });

    $("#assign-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const session = current();
      const agent = session?.agents.find((a) => a.key === state.openAgent);
      const subject = field(e.target, "subject").trim();
      if (!agent || !subject) return;
      if (await command({ kind: "task", subject, assignee: agent.name, label: `Task: ${subject} → ${agent.name}` }, "Task sent to the lead"))
        e.target.reset();
    });

    $("#shutdown-btn").addEventListener("click", async () => {
      const session = current();
      const agent = session?.agents.find((a) => a.key === state.openAgent);
      if (!agent || !confirm(`Ask ${agent.name} to shut down?`)) return;
      if (await command({ kind: "shutdown", name: agent.name, label: `Shut down ${agent.name}` }, "Shutdown requested"))
        $("#agent-dialog").close();
    });

    $("#agent-dialog").addEventListener("close", () => (state.openAgent = null));
  }

  wire();
  render();
  connect();
  setInterval(() => state.snap && render(), 15_000);
})();
