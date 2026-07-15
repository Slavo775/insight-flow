import type { HookEventInput, ProjectStatus } from "./types.js";

/**
 * N238 — deterministic lifecycle status engine (replaces the old "map the single
 * latest event" model in event-stream.ts). Status is a fold over the
 * timestamp-ordered event window into two dimensions:
 *
 *  - `turn`       — `idle` (never worked / session seed) → `active` (a turn is in
 *                   progress) → `finished` (a REAL Stop ended the turn). Only a
 *                   Stop marks finished; an idle/"waiting" Notification is a pause,
 *                   not a terminal, so it does NOT flip an active turn.
 *  - `permission` — a STICKY flag: set on a permission signal, cleared only by the
 *                   next real activity (PreToolUse/PostToolUse/UserPromptSubmit) or
 *                   a Stop. A pause/idle event does not clear it.
 *
 * `SubagentStop` is deliberately IGNORED for top-level status: a subagent
 * finishing must not flip the whole project to done.
 *
 * A time-based stuck-active decay is applied at read time (see `deriveStatus`):
 * `active` with no new event for `STUCK_ACTIVE_MS` reads as `idle`, a backstop
 * for a missed Stop hook.
 */

/** Working + no new event for this long → decay to `idle`. */
// ponytail: fixed 5-min backstop; wire to config only if a project needs it.
export const STUCK_ACTIVE_MS = 5 * 60_000;

const PERMISSION_RE = /permission/i;

type Turn = "idle" | "active" | "finished";

interface MachineState {
  turn: Turn;
  permission: boolean;
}

/** The transition a single hook event drives on the machine. */
type Action = "work" | "permission" | "stop" | "session-start" | "ignore";

/** Classify one hook event into a state-machine action. */
export function actionFromEvent(event: HookEventInput): Action {
  const t = event.type;
  // Terminals — the MAIN agent finished a turn.
  if (t === "Stop" || t === "SessionEnd") return "stop";
  if (t === "stop" || t === "sessionEnd") return "stop"; // Cursor camelCase (N77)
  // Derived terminals from the log-event CLI path (EVENT_TYPES).
  if (t === "agent-idle" || t === "session-end" || t === "idle" || t === "done") return "stop";
  // A subagent stopping — NOT a top-level terminal (N238). Ignore it so a
  // finished subagent doesn't flip the project to done mid-work.
  if (t === "SubagentStop" || t === "subagentStop" || t === "subagent-done") return "ignore";
  // Permission signals (sticky).
  if (t === "PermissionRequest" || t === "approval-required") return "permission";
  // N238 review-fix (blocker 2) — also match the dash-case `notification` (the
  // activity-feed / Cursor-fallback derived name, `hook-parse.ts`), else it fell
  // through to the `work` default and wrongly marked a paused/finished project
  // active. Its activity-path payload is empty, so PERMISSION_RE won't match and
  // it resolves to `ignore` — a pause, never a terminal.
  if (t === "Notification" || t === "notification") {
    const msg = String(event.payload?.message ?? "");
    // Permission wording → sticky pending. Idle/"waiting for input" wording is a
    // pause, NOT a terminal in this model (only a real Stop is), so ignore it.
    return PERMISSION_RE.test(msg) ? "permission" : "ignore";
  }
  // SessionStart seeds a session but isn't work yet. N238 review-fix (blocker 1)
  // — include the dash-case `session-start` (activity-feed name, `activity.json`;
  // Cursor `sessionStart→session-start`, `hook-parse.ts`), else it fell through
  // to `work` → active and non-deterministically overrode the CamelCase idle-seed.
  if (t === "SessionStart" || t === "sessionStart" || t === "session-start") return "session-start";
  // UserPromptSubmit, PreToolUse, PostToolUse, and any working lifecycle name.
  return "work";
}

function reduce(state: MachineState, action: Action): MachineState {
  switch (action) {
    case "work":
      // Real activity: the turn is active and any pending permission is resolved.
      return { turn: "active", permission: false };
    case "permission":
      // Sticky: Claude is mid-turn but blocked. Keep the turn, raise the flag.
      return { turn: state.turn === "idle" ? "active" : state.turn, permission: true };
    case "stop":
      return { turn: "finished", permission: false };
    case "session-start":
      return { turn: "idle", permission: false };
    case "ignore":
      return state;
  }
}

function effective(state: MachineState): ProjectStatus {
  if (state.permission) return "awaiting-permission";
  if (state.turn === "active") return "active";
  if (state.turn === "finished") return "done";
  return "idle";
}

const INITIAL: MachineState = { turn: "idle", permission: false };

/**
 * The standalone status a single event implies (as if it were the only event
 * seen from a fresh session). Kept for the public API / display; the authoritative
 * status comes from {@link deriveStatus} folding the whole window.
 */
export function statusFromEvent(event: HookEventInput): ProjectStatus {
  return effective(reduce(INITIAL, actionFromEvent(event)));
}

/**
 * Fold the timestamp-ordered event window into a status. When `nowMs` is given,
 * applies the stuck-active decay (`active` + stale newest event → `idle`).
 */
export function deriveStatus(events: readonly HookEventInput[], nowMs?: number): ProjectStatus {
  let state = INITIAL;
  for (const e of events) state = reduce(state, actionFromEvent(e));
  const status = effective(state);
  if (status === "active" && nowMs !== undefined && events.length > 0) {
    const newest = Date.parse(events[events.length - 1].timestamp);
    if (!Number.isNaN(newest) && nowMs - newest > STUCK_ACTIVE_MS) return "idle";
  }
  return status;
}
