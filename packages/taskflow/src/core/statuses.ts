// N110 — the canonical task status/verdict values as a plain const, zod-free,
// so the dashboard client (trigger picker) and the Zod schemas share one
// source of truth without bundling zod into the browser build.
export const TASK_STATUSES = [
  "ready",
  "in-progress",
  "implemented",
  "reviewing",
  "approved",
  "fix-needed",
  "fixing",
  "fixed",
  "pushed",
  "merged",
  "done",
  "request-changes",
  "changes-requested",
  "changes-implementing",
  "changes-implemented",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
