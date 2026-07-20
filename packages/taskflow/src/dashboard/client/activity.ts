// Activity-feed model + shared helpers (event key, relative time, verbosity
// filter, colors). The per-item rendering now lives in ActivityItem.tsx as JSX
// (N255 — replaced the HTML-string + dangerouslySetInnerHTML renderer).
import { hexToRgb } from "./lib.js";
import { tokens } from "./theme.js";

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

// N227 — the badge status type + its derivation now live in core so the server
// is the single source of truth. Re-exported here to keep existing client
// imports (`./activity.js`) working.
export type { ClaudeStatus } from "../../core/activity-status.js";

export type HookStatus = "ok" | "hook-missing" | "settings-missing" | "both-missing" | string;

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

export function shouldShowEvent(ev: ActivityEvent, verbosity: string): boolean {
  const tool = ev.tool || "";
  if (verbosity === "milestones") return tool === "Event" || tool === "Phase" || tool === "Skill";
  if (verbosity === "detailed")
    return tool !== "Activity" && tool !== "Event" && tool !== "Phase" && tool !== "Skill";
  return true;
}

function hookEventColor(evtType: string): string {
  if (evtType === "approval-required") return tokens.color.yellow;
  if (["approval-denied", "tool-blocked", "turn-failed", "tool-failed"].includes(evtType))
    return tokens.color.red;
  if (evtType === "approval-granted" || evtType === "tool-approved") return tokens.color.green;
  if (evtType === "subagent-start" || evtType === "subagent-done") return tokens.color.purple;
  if (evtType === "agent-active" || evtType === "tool-requested") return tokens.color.cyan;
  if (evtType === "file-written" || evtType === "file-edited") return tokens.color.cyan;
  return tokens.color.textMuted;
}

export function eventColor(ev: ActivityEvent): string {
  if (ev.tool === "Event" && ev.source === "hook") return hookEventColor(ev.action || "");
  if (ev.tool === "Skill") return tokens.color.purple;
  if (ev.tool === "Phase") return tokens.color.cyan;
  if (ev.tool === "Activity") return tokens.color.amber;
  if (ev.tool === "Tool") return tokens.color.green;
  return tokens.color.textMuted;
}

export function itemBackground(ev: ActivityEvent): {
  borderBottomColor: string;
  background: string;
} {
  const color = eventColor(ev);
  return { borderBottomColor: color, background: `rgba(${hexToRgb(color)},0.08)` };
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
