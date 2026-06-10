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
  selectedTaskId: string | null;
  // actions
  setConnection: (c: ConnStatus) => void;
  setAgentStatus: (s: ClaudeStatus) => void;
  applySnapshot: (snap: DashboardSnapshot, activity: ActivityEvent[]) => void;
  addActivityEvent: (ev: ActivityEvent) => void;
  selectTask: (id: string | null) => void;
  loadShard: (name: string) => Promise<void>;
  sync: () => Promise<void>;
}

// Module-level dedupe set for activity events (mirrors the old hook's seenRef).
const seen = new Set<string>();

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  connection: "reconnecting",
  agentStatus: "idle",
  snapshot: null,
  activityEvents: [],
  shards: [],
  currentShard: null,
  tasks: [],
  label: "Loading...",
  selectedTaskId: null,

  setConnection: (c) => set({ connection: c }),
  setAgentStatus: (s) => set({ agentStatus: s }),

  applySnapshot: (snap, activity) => {
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
    set({ snapshot: snap, activityEvents: fresh.slice(0, ACTIVITY_CAP) });
  },

  addActivityEvent: (ev) => {
    const key = ev.id || eventKey(ev);
    if (seen.has(key)) return;
    seen.add(key);
    set((s) => ({ activityEvents: [ev, ...s.activityEvents].slice(0, ACTIVITY_CAP) }));
  },

  selectTask: (id) => set({ selectedTaskId: id }),

  loadShard: async (name) => {
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
    set({ currentShard: name, tasks: shardTasks, label });
  },

  // file-change / reconnect → re-fetch the shard index + the current shard.
  sync: async () => {
    const index = await fetchShardIndex();
    set({ shards: index });
    const name = get().currentShard || index[0];
    if (name) await get().loadShard(name);
  },
}));
