import type { HookEventInput, ProjectStatus } from "../../core/types.js";
// N238 — status is now a deterministic fold over the window (lifecycle state
// machine in core/), not a per-latest-event heuristic. Re-exported for the
// public barrel + existing consumers.
import { deriveStatus, statusFromEvent } from "../../core/status-machine.js";

export { deriveStatus, statusFromEvent };

const MAX_EVENTS = 200;

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
    // N238 — apply the stuck-active decay at read time (an `active` turn with no
    // new event for STUCK_ACTIVE_MS reads as idle). Cheap: only re-derives when
    // the cached status is `active`.
    if (this.status === "active") return deriveStatus(this.events, Date.now());
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
