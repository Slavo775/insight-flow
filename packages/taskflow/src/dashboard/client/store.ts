// N86 — global dashboard state (Zustand). Centralizes everything app-wide so
// components read via selectors instead of prop-drilling: agent + connection
// status, the SSE config snapshot, the live activity feed, and the board data
// (shards / current shard / tasks / selection). View-local state (settings
// popover open, active activity tab) deliberately stays in component state.
import { create } from "zustand";
import type { ActivityEvent, ClaudeStatus } from "./activity.js";
import { ACTIVITY_CAP, eventKey } from "./activity.js";
import type { MasterResponse } from "./api.js";
import { fetchMaster, fetchShard, fetchShardIndex } from "./api.js";
import type { Task } from "./lib.js";

export type ConnStatus = "connected" | "reconnecting";

export interface DashboardSnapshot {
  activityEnabled: boolean;
  hookStatus: string;
  projectName: string;
  browserNotifications: boolean;
  soundsEnabled: boolean;
  verbosity: string;
}

interface DashboardStore {
  // global status (fed by the SSE stream)
  connection: ConnStatus;
  agentStatus: ClaudeStatus | null;
  snapshot: DashboardSnapshot | null;
  activityEvents: ActivityEvent[];
  // board data
  shards: string[];
  currentShard: string | null;
  tasks: Task[];
  label: string;
  // N228 — non-null when the initial/board data fetch failed or timed out; the
  // UI shows this + a Retry instead of a permanent "Loading…" spinner.
  loadError: string | null;
  selectedTaskId: string | null;
  // actions
  setConnection: (c: ConnStatus) => void;
  setAgentStatus: (s: ClaudeStatus) => void;
  applySnapshot: (
    snap: DashboardSnapshot,
    activity: ActivityEvent[],
    agentStatus?: ClaudeStatus | null,
  ) => void;
  addActivityEvent: (ev: ActivityEvent) => void;
  selectTask: (id: string | null) => void;
  loadShard: (name: string) => Promise<void>;
  sync: () => Promise<void>;
  ensureTask: (id: string) => Promise<void>;
}

// Module-level dedupe set for activity events (mirrors the old hook's seenRef).
const seen = new Set<string>();

// N228 — a fetch aborted by the request timeout throws a raw AbortError
// ("The operation was aborted"); show a human message on the retry banner.
function loadErrorText(e: unknown, fallback: string): string {
  if (e instanceof Error && e.name === "AbortError") return "Timed out — retrying…";
  return (e as Error)?.message || fallback;
}

// N228 — auto-retry a failed board load on a fixed backoff so the dashboard
// self-recovers once the (possibly wedged/restarting) server answers again,
// without the user reloading. One timer at a time.
const SYNC_RETRY_MS = 5000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRetry(run: () => void): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    run();
  }, SYNC_RETRY_MS);
}
function clearRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  connection: "reconnecting",
  agentStatus: "idle",
  snapshot: null,
  activityEvents: [],
  shards: [],
  currentShard: null,
  tasks: [],
  label: "Loading...",
  loadError: null,
  selectedTaskId: null,

  setConnection: (c) => set({ connection: c }),
  setAgentStatus: (s) => set({ agentStatus: s }),

  applySnapshot: (snap, activity, agentStatus) => {
    // Reset the feed to the server's authoritative state on every snapshot
    // (incl. reconnects) so stale client events are not duplicated.
    seen.clear();
    const fresh: ActivityEvent[] = [];
    for (const ev of activity) {
      const key = ev.id || eventKey(ev);
      if (seen.has(key)) continue;
      seen.add(key);
      fresh.unshift(ev);
    }
    // N227 — seed the agent badge from the server's derived status (single
    // source of truth) so a fresh load reflects reality instead of the "idle"
    // default. Older servers omit it → keep the current value.
    set({
      snapshot: snap,
      activityEvents: fresh.slice(0, ACTIVITY_CAP),
      ...(agentStatus ? { agentStatus } : {}),
    });
  },

  addActivityEvent: (ev) => {
    const key = ev.id || eventKey(ev);
    if (seen.has(key)) return;
    seen.add(key);
    set((s) => ({ activityEvents: [ev, ...s.activityEvents].slice(0, ACTIVITY_CAP) }));
  },

  selectTask: (id) => set({ selectedTaskId: id }),

  loadShard: async (name) => {
    try {
      const [shardTasks, master] = await Promise.all([
        fetchShard(name),
        fetchMaster().catch((): MasterResponse => ({})),
      ]);
      const current = master?.meta?.currentTaskId ?? null;
      let label =
        "Shard: " +
        name.replace("tasks-", "").replace(".json", "") +
        " · " +
        shardTasks.length +
        " tasks";
      if (current) label += " · current " + current;
      set({ currentShard: name, tasks: shardTasks, label, loadError: null });
      clearRetry();
    } catch (e) {
      // N228 — a timed-out/failed shard load surfaces as an error + auto-retry
      // instead of leaving the board on a stale/empty state indefinitely.
      set({ loadError: loadErrorText(e, "Couldn't load tasks") });
      scheduleRetry(() => void get().sync());
    }
  },

  // file-change / reconnect → re-fetch the shard index + the current shard.
  sync: async () => {
    try {
      const index = await fetchShardIndex();
      set({ shards: index, loadError: null });
      const name = get().currentShard || index[0];
      if (name) await get().loadShard(name);
    } catch (e) {
      set({ loadError: loadErrorText(e, "Couldn't load the dashboard") });
      scheduleRetry(() => void get().sync());
    }
  },

  // N87: ensure the task for `id` is loaded — it may live in a different shard
  // than the current one (used by the /task/:id detail page). Picks the shard
  // whose parsed range contains the id's number.
  ensureTask: async (id) => {
    if (get().tasks.some((t) => t.id === id)) return;
    const index = get().shards.length ? get().shards : await fetchShardIndex();
    const num = parseInt(id.replace(/\D/g, ""), 10);
    const target = index.find((f) => {
      const m = f.match(/tasks-N(\d+)-N(\d+)\.json/);
      return !!m && num >= Number(m[1]) && num <= Number(m[2]);
    });
    if (target) {
      set({ shards: index });
      await get().loadShard(target);
    }
  },
}));
