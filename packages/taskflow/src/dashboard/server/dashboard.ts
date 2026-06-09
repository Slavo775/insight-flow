import type { TaskflowConfig } from "../../core/types.js";

const NAV_CSS = `    .top-nav { position: sticky; top: -24px; z-index: 100; background: var(--surface); border-bottom: 1px solid var(--border); height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; margin: -24px -24px 24px -24px; }
    .nav-project { font-size: 13px; font-weight: 600; color: var(--text); letter-spacing: -0.01em; }
    .nav-links { display: flex; gap: 4px; }
    .nav-link { font-size: 13px; color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: 6px; transition: background 0.15s, color 0.15s; }
    .nav-link:hover { background: var(--border); color: var(--text); }
    .nav-link.active { background: var(--accent); color: #fff; }`;

const CONFIG_PAGE_CSS = `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0a; --surface: #141414; --border: #262626;
      --text: #e5e5e5; --text-muted: #737373; --accent: #3b82f6;
    }
    body { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg); color: var(--text); padding: 24px; }
    .config-page { max-width: 800px; margin: 0 auto; }
    .config-page > h1 { font-size: 18px; margin-bottom: 6px; }
    .config-subtitle { font-size: 12px; color: var(--text-muted); margin-bottom: 24px; }
    .config-subtitle code { background: var(--border); padding: 1px 6px; border-radius: 3px; font-family: inherit; }
    .config-sections { display: flex; flex-direction: column; gap: 16px; }
    .config-section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; }
    .config-section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 12px; }
    .config-row { display: grid; grid-template-columns: 220px 1fr; gap: 6px 16px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); align-items: start; }
    .config-row:last-child { border-bottom: none; }
    .config-key { font-size: 12px; color: var(--text-muted); word-break: break-all; }
    .config-val { font-size: 12px; color: var(--text); word-break: break-word; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px; }
    .config-val.is-default { color: var(--text-muted); }
    .config-val.is-custom { color: var(--accent); }
    .config-badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 500; flex-shrink: 0; }
    .config-badge.default { background: var(--border); color: var(--text-muted); }
    .config-badge.custom { background: rgba(59,130,246,0.18); color: var(--accent); }
    .config-code { background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 4px; padding: 8px 10px; font-size: 11px; white-space: pre-wrap; word-break: break-word; width: 100%; margin-top: 2px; }
    .config-sub { padding-left: 12px; border-left: 2px solid var(--border); width: 100%; margin-top: 4px; }
${NAV_CSS}`;

export function getNavCss(): string {
  return NAV_CSS;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getNavHtml(
  projectName: string,
  activePage: "home" | "overview" | "config",
): string {
  return (
    '  <nav class="top-nav">\n' +
    '    <span class="nav-project">' +
    escHtml(projectName || "insight-flow") +
    "</span>\n" +
    '    <div class="nav-links">\n' +
    '      <a href="/" class="nav-link' +
    (activePage === "home" ? " active" : "") +
    '">Home</a>\n' +
    '      <a href="/overview" class="nav-link' +
    (activePage === "overview" ? " active" : "") +
    '">Overview</a>\n' +
    '      <a href="/config" class="nav-link' +
    (activePage === "config" ? " active" : "") +
    '">Config</a>\n' +
    "    </div>\n" +
    "  </nav>\n"
  );
}

export function getConfigPageHtml(config: TaskflowConfig): string {
  const projectName = config.projectName || "";

  function cfgRow(key: string, displayVal: string, isDefault: boolean): string {
    const cls = isDefault ? "is-default" : "is-custom";
    const badge = isDefault
      ? '<span class="config-badge default">default</span>'
      : '<span class="config-badge custom">custom</span>';
    return (
      '    <div class="config-row">' +
      '<span class="config-key">' +
      escHtml(key) +
      "</span>" +
      '<span class="config-val ' +
      cls +
      '">' +
      escHtml(displayVal) +
      " " +
      badge +
      "</span>" +
      "</div>\n"
    );
  }

  function cfgValRow(key: string, valHtml: string): string {
    return (
      '    <div class="config-row">' +
      '<span class="config-key">' +
      escHtml(key) +
      "</span>" +
      '<span class="config-val">' +
      valHtml +
      "</span>" +
      "</div>\n"
    );
  }

  function cfgSection(title: string, content: string): string {
    return (
      '    <div class="config-section">\n' +
      "      <h2>" +
      escHtml(title) +
      "</h2>\n" +
      content +
      "    </div>\n"
    );
  }

  // General
  const general =
    cfgRow("workDir", config.workDir, config.workDir === "workTasks") +
    cfgRow("shardSize", String(config.shardSize), config.shardSize === 10) +
    cfgRow("projectName", config.projectName, false) +
    cfgRow("rolesDir", config.rolesDir, config.rolesDir === ".claude/roles");

  // Server — default port must match config.ts DEFAULTS.server.port
  const server = cfgRow(
    "server.port",
    String(config.server?.port ?? 6006),
    (config.server?.port ?? 6006) === 6006,
  );

  // Activity Engine — defaults mirror config.ts ACTIVITY_DEFAULTS
  const ae = config.activityEngine;
  const activityRows =
    cfgRow("enabled", String(ae?.enabled ?? true), (ae?.enabled ?? true) === true) +
    cfgRow(
      "logFile",
      ae?.logFile ?? ".taskflow-activity.jsonl",
      (ae?.logFile ?? ".taskflow-activity.jsonl") === ".taskflow-activity.jsonl",
    ) +
    cfgRow("maxEvents", String(ae?.maxEvents ?? 200), (ae?.maxEvents ?? 200) === 200) +
    cfgRow("phaseMarkers", String(ae?.phaseMarkers ?? true), (ae?.phaseMarkers ?? true) === true) +
    cfgRow(
      "hookEnrichment",
      String(ae?.hookEnrichment ?? true),
      (ae?.hookEnrichment ?? true) === true,
    ) +
    cfgRow("verbosity", ae?.verbosity ?? "both", (ae?.verbosity ?? "both") === "both");

  // Notifications
  const notif = config.notifications;
  const notifRows =
    cfgRow("browser", String(notif?.browser ?? true), (notif?.browser ?? true) === true) +
    cfgRow("cli", String(notif?.cli ?? true), (notif?.cli ?? true) === true) +
    cfgRow(
      "sounds.enabled",
      String(notif?.sounds?.enabled ?? true),
      (notif?.sounds?.enabled ?? true) === true,
    );

  // Master
  const master = config.master;
  const masterRows =
    cfgRow(
      "url",
      master?.url ?? "http://localhost:6100",
      (master?.url ?? "http://localhost:6100") === "http://localhost:6100",
    ) +
    cfgRow("port", String(master?.port ?? 6100), (master?.port ?? 6100) === 6100) +
    cfgRow(
      "standalone",
      String(master?.standalone ?? false),
      (master?.standalone ?? false) === false,
    ) +
    cfgRow(
      "startMasterLocally",
      String(master?.startMasterLocally ?? true),
      (master?.startMasterLocally ?? true) === true,
    );

  // Events
  const evts = config.events;
  let eventsRows = cfgRow(
    "dedupWindowSeconds",
    String(evts?.dedupWindowSeconds ?? 60),
    (evts?.dedupWindowSeconds ?? 60) === 60,
  );
  if (evts?.hooks) {
    for (const [evtType, cmds] of Object.entries(evts.hooks)) {
      if (Array.isArray(cmds) && cmds.length > 0) {
        eventsRows += cfgValRow(
          "hooks." + evtType,
          '<span class="config-badge custom">custom</span>' +
            '<pre class="config-code">' +
            escHtml(cmds.join("\n")) +
            "</pre>",
        );
      }
    }
  }

  // Agents
  const agents = config.agents;
  let agentsRows = "";

  const gitPerms = agents?.git?.permissions;
  if (gitPerms && Object.keys(gitPerms).length > 0) {
    const boolKeys = [
      "createBranch",
      "checkout",
      "commit",
      "push",
      "forcePush",
      "merge",
      "deleteBranchLocal",
      "deleteBranchRemote",
      "createPR",
    ];
    let subRows = "";
    if (gitPerms.remoteOps !== undefined) {
      const isDeny = gitPerms.remoteOps === "deny";
      subRows += cfgRow("remoteOps", gitPerms.remoteOps, !isDeny);
    }
    for (const k of boolKeys) {
      const v = (gitPerms as Record<string, boolean | undefined>)[k];
      if (v !== undefined) {
        subRows += cfgRow(k, String(v), v === true);
      }
    }
    agentsRows += cfgValRow(
      "git.permissions",
      '<span class="config-badge custom">custom</span><div class="config-sub">' +
        subRows +
        "</div>",
    );
  } else {
    agentsRows += cfgRow("git.permissions", "all allowed", true);
  }

  const extend = agents?.extend;
  if (extend && Object.keys(extend).length > 0) {
    for (const [agentName, lines] of Object.entries(extend)) {
      agentsRows += cfgValRow(
        "extend." + agentName,
        '<span class="config-badge custom">custom</span>' +
          '<pre class="config-code">' +
          escHtml(lines.join("\n")) +
          "</pre>",
      );
    }
  } else {
    agentsRows += cfgRow("extend", "none", true);
  }

  const custom = agents?.custom;
  if (custom && custom.length > 0) {
    for (const ca of custom) {
      agentsRows += cfgValRow(
        "custom." + ca.name,
        '<span class="config-badge custom">custom</span> ' + escHtml(ca.description || ca.role),
      );
    }
  }

  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    "  <title>Config — Taskflow</title>\n" +
    "  <style>\n" +
    CONFIG_PAGE_CSS +
    "\n  </style>\n" +
    "</head>\n<body>\n" +
    getNavHtml(projectName, "config") +
    '  <div class="config-page">\n' +
    "    <h1>Configuration</h1>\n" +
    '    <p class="config-subtitle">Active settings from <code>taskflow.config.json</code></p>\n' +
    '    <div class="config-sections">\n' +
    cfgSection("General", general) +
    cfgSection("Server", server) +
    cfgSection("Activity Engine", activityRows) +
    cfgSection("Agents", agentsRows) +
    cfgSection("Notifications", notifRows) +
    cfgSection("Master", masterRows) +
    cfgSection("Events", eventsRows) +
    "    </div>\n" +
    "  </div>\n" +
    "</body>\n</html>"
  );
}
