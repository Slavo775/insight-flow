import type { HookEventInput, ProjectStatus } from "../../core/types.js";

const MAX_EVENTS = 200;
const PERMISSION_RE = /permission/i;

/**
 * Decide the project status implied by a single hook event. Idle wording in a
 * Notification payload (e.g. "Claude is waiting for your input") is the only
 * way to land on `idle`; permission wording flips to `awaiting-permission`.
 */
export function statusFromEvent(event: HookEventInput): ProjectStatus {
  const t = event.type;
  // Raw Claude Code hook names
  if (t === "Stop" || t === "SubagentStop") return "done";
  if (t === "PermissionRequest") return "awaiting-permission";
  // Raw Cursor hook names (camelCase) — N77. Cursor's `stop` ends a turn.
  if (t === "stop" || t === "subagentStop" || t === "sessionEnd") return "done";
  if (t === "Notification") {
    const msg = String(event.payload?.message ?? "");
    if (PERMISSION_RE.test(msg)) return "awaiting-permission";
    return "idle";
  }
  // Derived event names emitted by the existing log-event CLI path. Kept so
  // legacy callers POSTing the old naming still get a sensible status.
  // N227 — also recognize the bare agent-lifecycle terminals (`log-event
  // done`/`idle`, EVENT_TYPES): these flow through the seeded activity feed and
  // must read as not-working, else the badge shows "active" while idle. The
  // working lifecycle names (`edit-start`, `research-end`, …) correctly fall
  // through to the "active" default below.
  if (t === "agent-idle" || t === "session-end" || t === "idle" || t === "done") return "done";
  if (t === "approval-required") return "awaiting-permission";
  return "active";
}

/**
 * Derive overall status from a sorted-by-timestamp event window. The newest
 * event by `timestamp` (not arrival order) wins. Empty window → `idle`
 * (nothing has happened yet).
 */
export function deriveStatus(events: readonly HookEventInput[]): ProjectStatus {
  if (events.length === 0) return "idle";
  const latest = events[events.length - 1];
  return statusFromEvent(latest);
}

/**
 * Bounded in-memory event window. Events are inserted in timestamp order so
 * out-of-order arrivals (rare network jitter, retries) don't flip status the
 * wrong way. The oldest event is dropped past MAX_EVENTS.
 */
export class EventStore {
  private events: HookEventInput[] = [];
  private status: ProjectStatus = "idle";
  private seenIds = new Set<string>();

  /**
   * Insert an event. Returns the previous status, current status, and whether
   * this event was a duplicate (same id seen recently). Duplicates are dropped
   * silently — useful for at-least-once delivery from hooks.
   */
  insert(event: HookEventInput): {
    duplicate: boolean;
    from: ProjectStatus;
    to: ProjectStatus;
  } {
    const from = this.status;
    if (this.seenIds.has(event.id)) {
      return { duplicate: true, from, to: from };
    }
    this.seenIds.add(event.id);

    // Insert in timestamp order. Most arrivals are append; binary search
    // fallback handles out-of-order cases cheaply enough at N=200.
    const lastTs = this.events.length ? this.events[this.events.length - 1].timestamp : "";
    if (event.timestamp >= lastTs) {
      this.events.push(event);
    } else {
      const insertAt = this.findInsertIndex(event.timestamp);
      this.events.splice(insertAt, 0, event);
    }

    // Evict oldest if over capacity.
    while (this.events.length > MAX_EVENTS) {
      const dropped = this.events.shift();
      if (dropped) this.seenIds.delete(dropped.id);
    }

    this.status = deriveStatus(this.events);
    return { duplicate: false, from, to: this.status };
  }

  getStatus(): ProjectStatus {
    return this.status;
  }

  getEvents(): readonly HookEventInput[] {
    return this.events;
  }

  private findInsertIndex(timestamp: string): number {
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.events[mid].timestamp <= timestamp) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}
