import type { ProjectStatus } from "./types.js";

/**
 * The agent-activity badge status shown in the dashboard header and the master
 * overview pill. Derived from the server's four-state {@link ProjectStatus} so
 * there is a single source of truth (N227) — the client no longer classifies
 * raw activity rows on its own.
 */
export type ClaudeStatus = "active" | "idle" | "permission-needed";

/**
 * Project the server's {@link ProjectStatus} onto the three-state badge status.
 * A finished turn (`done`) reads as `idle`; `awaiting-permission` surfaces as
 * `permission-needed`. This is the only place the mapping lives — both the
 * dashboard (initial snapshot + live `status` frames) and the master overview
 * render from it.
 */
export function claudeStatusFromProjectStatus(status: ProjectStatus): ClaudeStatus {
  switch (status) {
    case "awaiting-permission":
      return "permission-needed";
    case "active":
      return "active";
    // "idle" and "done" both mean "not actively working" for the badge.
    default:
      return "idle";
  }
}
