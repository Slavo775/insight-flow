import type { PublicProjectEntry } from "../types.js";

// N231 — project → display helpers, ported from overview.ts. A project that has
// not checked in for 60s renders neutral, regardless of its last-pushed
// claudeStatus (the registry never clears it on disconnect), so every visual is
// gated on liveness first.

export function isProjectLive(lastSeenAt: string): boolean {
  return (Date.now() - new Date(lastSeenAt).getTime()) / 1000 < 60;
}

/** The claudeStatus we may display: the pushed value only while the project is live. */
export function effectiveClaudeStatus(p: PublicProjectEntry): string | null {
  return isProjectLive(p.lastSeenAt) ? (p.state.claudeStatus ?? null) : null;
}

/** The current-task line shown under the project name (Lovable: plain muted text). */
export function taskText(p: PublicProjectEntry): string {
  const s = p.state;
  if (s.currentTaskId) {
    return s.currentTaskTitle ? `${s.currentTaskId} — ${s.currentTaskTitle}` : s.currentTaskId;
  }
  return p.online ? "No active task" : "Server is offline";
}

/** The project shown in the "Currently working on" hero: the first live, active one. */
export function currentlyWorking(projects: PublicProjectEntry[]): PublicProjectEntry | null {
  return projects.find((p) => p.online && effectiveClaudeStatus(p) === "active") ?? null;
}
