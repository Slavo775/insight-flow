// Activity-feed model + renderers, ported from dashboard.ts. The per-item HTML
// is built as a string (escaped) and injected via dangerouslySetInnerHTML so the
// rich icon/badge taxonomy matches the legacy dashboard exactly.
import { hexToRgb } from "./lib.js";

export interface ActivityEvent {
  id?: string;
  ts?: string;
  tool?: string;
  action?: string;
  source?: string;
  message?: string;
  file?: string;
  label?: string;
  skill?: string;
  provider?: string;
  taskId?: string;
  toolName?: string;
  inputSummary?: string;
  promptPreview?: string;
  errorType?: string;
  agentType?: string;
}

export type ClaudeStatus = "active" | "idle" | "permission-needed";

export type HookStatus = "ok" | "hook-missing" | "settings-missing" | "both-missing" | string;

export function escHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

export function eventKey(ev: ActivityEvent): string {
  return (
    (ev.ts || "") +
    "|" +
    (ev.tool || "") +
    "|" +
    (ev.action || "") +
    "|" +
    (ev.message || ev.file || "")
  );
}

export function relativeTime(ts?: string): string {
  if (!ts) return "now";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 1000) return "now";
  if (diff < 60000) return Math.floor(diff / 1000) + "s";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m";
  return Math.floor(diff / 3600000) + "h";
}

export function claudeStatusFromEvent(ev: ActivityEvent): ClaudeStatus | null {
  if (ev.tool === "Event" && ev.action === "start") return "active";
  if (ev.tool === "Event" && ev.source === "hook" && ev.action === "agent-active") return "active";
  if (ev.tool === "Event" && ev.source === "hook" && ev.action === "agent-idle") return "idle";
  if (ev.tool === "Event" && ev.source === "hook" && ev.action === "approval-required")
    return "permission-needed";
  if (ev.tool === "Event" && ev.source === "hook" && ev.action === "tool-approved") return "active";
  return null;
}

export function shouldShowEvent(ev: ActivityEvent, verbosity: string): boolean {
  const tool = ev.tool || "";
  if (verbosity === "milestones") return tool === "Event" || tool === "Phase" || tool === "Skill";
  if (verbosity === "detailed")
    return tool !== "Activity" && tool !== "Event" && tool !== "Phase" && tool !== "Skill";
  return true;
}

function toolIcon(tool?: string): { cls: string; icon: string } {
  const t = (tool || "").toLowerCase();
  if (t === "read" || t === "glob" || t === "grep") return { cls: "read", icon: "R" };
  if (t === "edit") return { cls: "edit", icon: "E" };
  if (t === "write") return { cls: "write", icon: "W" };
  if (t === "bash") return { cls: "bash", icon: "$" };
  return { cls: "other", icon: "?" };
}

function hookEventColor(evtType: string): string {
  if (evtType === "approval-required") return "#eab308";
  if (["approval-denied", "tool-blocked", "turn-failed", "tool-failed"].includes(evtType))
    return "#ef4444";
  if (evtType === "approval-granted" || evtType === "tool-approved") return "#22c55e";
  if (evtType === "subagent-start" || evtType === "subagent-done") return "#a855f7";
  if (evtType === "agent-active" || evtType === "tool-requested") return "#06b6d4";
  if (evtType === "file-written" || evtType === "file-edited") return "#06b6d4";
  return "#737373";
}

export function eventColor(ev: ActivityEvent): string {
  if (ev.tool === "Event" && ev.source === "hook") return hookEventColor(ev.action || "");
  if (ev.tool === "Skill") return "#a855f7";
  if (ev.tool === "Phase") return "#06b6d4";
  if (ev.tool === "Activity") return "#f59e0b";
  if (ev.tool === "Tool") return "#22c55e";
  return "#737373";
}

export function itemBackground(ev: ActivityEvent): {
  borderBottomColor: string;
  background: string;
} {
  const color = eventColor(ev);
  return { borderBottomColor: color, background: `rgba(${hexToRgb(color)},0.08)` };
}

function providerBadge(ev: ActivityEvent): string {
  const p = ev && ev.provider;
  if (!p || p === "claude") return "";
  const cls = p === "cursor" ? "activity-badge-provider-cursor" : "activity-badge-provider-other";
  return (
    '<span class="activity-badge ' +
    cls +
    '" title="' +
    escHtml(String(p)) +
    ' agent">' +
    escHtml(String(p)) +
    "</span> "
  );
}

function hookEventHtml(ev: ActivityEvent, evtType: string, ts: string): string {
  let hIconCls: string,
    hBadgeCls: string,
    hIcon: string,
    hDetail = "";
  if (evtType === "approval-required") {
    hIconCls = "hook-amber";
    hBadgeCls = "hook-amber";
    hIcon = "&#9888;";
    if (ev.toolName || ev.inputSummary)
      hDetail = escHtml(ev.toolName ? String(ev.toolName) : String(ev.inputSummary || "")).slice(
        0,
        40,
      );
  } else if (evtType === "approval-denied" || evtType === "tool-blocked") {
    hIconCls = "hook-red";
    hBadgeCls = "hook-red";
    hIcon = "&#10005;";
    if (ev.toolName) hDetail = escHtml(String(ev.toolName));
  } else if (evtType === "approval-granted" || evtType === "tool-approved") {
    hIconCls = "hook-green";
    hBadgeCls = "hook-green";
    hIcon = "&#10003;";
    if (ev.toolName) hDetail = escHtml(String(ev.toolName));
  } else if (evtType === "tool-requested" || evtType === "tool-failed") {
    hIconCls = evtType === "tool-failed" ? "hook-red" : "hook-blue";
    hBadgeCls = evtType === "tool-failed" ? "hook-red" : "hook-blue";
    hIcon = evtType === "tool-failed" ? "&#10005;" : "&#9654;";
    if (ev.toolName) hDetail = escHtml(String(ev.toolName));
  } else if (evtType === "session-start" || evtType === "session-end") {
    hIconCls = "hook-muted";
    hBadgeCls = "hook-muted";
    hIcon = "&#9711;";
  } else if (evtType === "agent-active") {
    hIconCls = "hook-blue";
    hBadgeCls = "hook-blue";
    hIcon = "&#9679;";
    if (ev.promptPreview) hDetail = escHtml(String(ev.promptPreview));
  } else if (evtType === "agent-idle") {
    hIconCls = "hook-muted";
    hBadgeCls = "hook-muted";
    hIcon = "&#9675;";
  } else if (evtType === "turn-failed") {
    hIconCls = "hook-red";
    hBadgeCls = "hook-red";
    hIcon = "&#9888;";
    if (ev.errorType) hDetail = escHtml(String(ev.errorType));
  } else if (evtType === "subagent-start" || evtType === "subagent-done") {
    hIconCls = "hook-purple";
    hBadgeCls = "hook-purple";
    hIcon = "&#10022;";
    if (ev.agentType) hDetail = escHtml(String(ev.agentType));
  } else if (evtType === "file-written" || evtType === "file-edited") {
    hIconCls = "hook-blue";
    hBadgeCls = "hook-blue";
    hIcon = "&#9999;";
    if (ev.file) hDetail = escHtml(String(ev.file).split("/").slice(-2).join("/"));
  } else if (evtType === "context-compacted") {
    hIconCls = "hook-muted";
    hBadgeCls = "hook-muted";
    hIcon = "&#8623;";
  } else {
    hIconCls = "hook-muted";
    hBadgeCls = "hook-muted";
    hIcon = "&#9679;";
  }
  return (
    '<div class="activity-icon ' +
    hIconCls +
    '">' +
    hIcon +
    "</div>" +
    '<div style="flex:1;min-width:0">' +
    providerBadge(ev) +
    '<span class="activity-badge activity-badge-' +
    hBadgeCls +
    '">' +
    escHtml(evtType) +
    "</span>" +
    (hDetail ? ' <span class="activity-file-muted">' + hDetail + "</span>" : "") +
    (ev.taskId
      ? ' <span class="activity-file-muted" style="opacity:0.6">' +
        escHtml(String(ev.taskId)) +
        "</span>"
      : "") +
    "</div>" +
    '<span class="activity-time" data-ts="' +
    escHtml(ts) +
    '">' +
    relativeTime(ts) +
    "</span>"
  );
}

export function renderActivityItemHtml(ev: ActivityEvent): string {
  const tool = ev.tool || "?";
  const ts = ev.ts || "";

  if (tool === "Activity") {
    return (
      '<div class="activity-icon phase">&#9670;</div>' +
      '<div style="flex:1;min-width:0">' +
      providerBadge(ev) +
      '<span class="activity-phase-msg">' +
      escHtml(ev.message || "") +
      "</span>" +
      "</div>" +
      '<span class="activity-time" data-ts="' +
      escHtml(ts) +
      '">' +
      relativeTime(ts) +
      "</span>"
    );
  }

  if (tool === "Event") {
    const evtType = ev.action || "event";
    if ((ev.source || "agent") === "hook") return hookEventHtml(ev, evtType, ts);
    const isMandatory = evtType === "start" || evtType === "done";
    const evtIconClass = isMandatory ? "event-mandatory" : "event-optional";
    const evtBadgeClass = isMandatory
      ? "activity-badge-event-mandatory"
      : "activity-badge-event-optional";
    const evtIcon = evtType === "done" ? "&#10003;" : evtType === "start" ? "&#9654;" : "&#9679;";
    return (
      '<div class="activity-icon ' +
      evtIconClass +
      '">' +
      evtIcon +
      "</div>" +
      '<div style="flex:1;min-width:0">' +
      providerBadge(ev) +
      '<span class="activity-badge ' +
      evtBadgeClass +
      '">' +
      escHtml(evtType) +
      "</span>" +
      (ev.taskId ? ' <span class="activity-file-muted">' + escHtml(ev.taskId) + "</span>" : "") +
      "</div>" +
      '<span class="activity-time" data-ts="' +
      escHtml(ts) +
      '">' +
      relativeTime(ts) +
      "</span>"
    );
  }

  if (tool === "Phase") {
    const phaseAction = ev.action || "milestone";
    return (
      '<div class="activity-icon phase">&#9670;</div>' +
      '<div style="flex:1;min-width:0">' +
      providerBadge(ev) +
      '<span class="activity-badge activity-badge-phase">' +
      escHtml(phaseAction) +
      "</span> " +
      '<span class="activity-phase-msg">' +
      escHtml(ev.message || phaseAction) +
      "</span>" +
      "</div>" +
      '<span class="activity-time" data-ts="' +
      escHtml(ts) +
      '">' +
      relativeTime(ts) +
      "</span>"
    );
  }

  if (tool === "Skill") {
    return (
      '<div class="activity-icon skill">&#9889;</div>' +
      '<div style="flex:1;min-width:0">' +
      providerBadge(ev) +
      '<span class="activity-badge activity-badge-skill">' +
      escHtml(ev.action || "") +
      "</span> " +
      '<span class="activity-tool">/' +
      escHtml(ev.skill || "?") +
      "</span>" +
      "</div>" +
      '<span class="activity-time" data-ts="' +
      escHtml(ts) +
      '">' +
      relativeTime(ts) +
      "</span>"
    );
  }

  if (tool === "Tool" && ev.label) {
    const rawHtml = ev.file
      ? '<div class="activity-file-muted">' + escHtml(ev.file.slice(0, 80)) + "</div>"
      : "";
    return (
      '<div class="activity-icon bash">$</div>' +
      '<div style="flex:1;min-width:0">' +
      providerBadge(ev) +
      '<span class="activity-tool">' +
      escHtml(ev.label) +
      "</span>" +
      rawHtml +
      "</div>" +
      '<span class="activity-time" data-ts="' +
      escHtml(ts) +
      '">' +
      relativeTime(ts) +
      "</span>"
    );
  }

  const icon = toolIcon(tool);
  const fileStr = ev.file ? '<div class="activity-file">' + escHtml(ev.file) + "</div>" : "";
  return (
    '<div class="activity-icon ' +
    icon.cls +
    '">' +
    icon.icon +
    "</div>" +
    '<div style="flex:1;min-width:0">' +
    providerBadge(ev) +
    '<span class="activity-tool">' +
    escHtml(tool) +
    "</span> " +
    '<span style="color:var(--text-muted);font-size:10px">' +
    escHtml(ev.action || "") +
    "</span>" +
    fileStr +
    "</div>" +
    '<span class="activity-time" data-ts="' +
    escHtml(ts) +
    '">' +
    relativeTime(ts) +
    "</span>"
  );
}

export interface EmptyStateMessage {
  headline: string;
  body: string;
  hint?: string;
  command?: string;
  hintAfter?: string;
}

export function activityEmptyStateMessage(hookStatus: HookStatus): EmptyStateMessage | null {
  const installHint = {
    hint: "Run from the project root:",
    command: "insight-flow install-activity-hook",
    hintAfter: "Already-installed projects re-run safely (no-op).",
  };
  if (hookStatus === "hook-missing")
    return {
      headline: "Activity hook not installed",
      body: "The dashboard receives events from a Claude Code PostToolUse hook script that has not been created in this project yet.",
      ...installHint,
    };
  if (hookStatus === "settings-missing")
    return {
      headline: "Activity hook registered settings missing",
      body: "The hook script exists but no PostToolUse entry references it in .claude/settings.local.json.",
      ...installHint,
    };
  if (hookStatus === "both-missing")
    return {
      headline: "Activity hook not installed",
      body: "Neither .claude/hooks/taskflow-activity.sh nor a PostToolUse registration exists in this project.",
      ...installHint,
    };
  if (hookStatus === "ok")
    return {
      headline: "Waiting for Claude activity",
      body: "The hook is installed and the dashboard is connected. If events do not appear, restart your Claude Code session — settings.local.json is read at session start, so a hook added mid-session is not picked up until you launch a new session.",
    };
  return null;
}

export const ACTIVITY_CAP = 50;
