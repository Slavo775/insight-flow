import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClaudeStatus } from "./activity.js";
import type { MasterResponse } from "./api.js";
import { fetchMaster, fetchShard, fetchShardIndex } from "./api.js";
import { ActivityFeed } from "./ActivityFeed.js";
import { DetailPanel } from "./DetailPanel.js";
import type { Task } from "./lib.js";
import {
  loadNotifSettings,
  maybeRequestPermissionOnce,
  notifSettings,
  permissionHint,
  saveNotifSettings,
  updatePageTitle,
} from "./notifications.js";
import { useDashboardStream } from "./useDashboardStream.js";
import { Kanban, Nav, ShardNav, Stats, Timeline } from "./ui.js";

function activityStatusView(s: ClaudeStatus | null): { text: string; cls: string } {
  if (s === "active") return { text: "active", cls: "activity-status active" };
  if (s === "idle") return { text: "idle", cls: "activity-status idle" };
  if (s === "permission-needed")
    return { text: "🚨 permission", cls: "activity-status permission-needed" };
  return { text: "", cls: "activity-status" };
}

function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(notifSettings.sound);
  const [muteFocused, setMuteFocused] = useState(notifSettings.muteFocused);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc, true);
    return () => document.removeEventListener("click", onDoc, true);
  }, [open]);

  const persist = (next: { sound: boolean; muteFocused: boolean }): void => {
    setSound(next.sound);
    setMuteFocused(next.muteFocused);
    saveNotifSettings(next);
  };

  return (
    <div className="settings-wrap" ref={wrapRef}>
      <button
        className="settings-btn"
        title="Notification settings"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>
      <div className={"settings-popover" + (open ? " open" : "")}>
        <div className="settings-header">Notifications</div>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => persist({ sound: e.target.checked, muteFocused })}
          />{" "}
          Sound
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={muteFocused}
            onChange={(e) => persist({ sound, muteFocused: e.target.checked })}
          />{" "}
          Mute when tab focused
        </label>
        {open ? <div className="settings-hint">{permissionHint()}</div> : null}
      </div>
    </div>
  );
}

export function App() {
  const [shards, setShards] = useState<string[]>([]);
  const [currentShard, setCurrentShard] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [label, setLabel] = useState<string>("Loading...");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actTab, setActTab] = useState<"claude" | "recent">("claude");

  const currentShardRef = useRef<string | null>(null);

  const loadShard = useCallback(async (name: string) => {
    setCurrentShard(name);
    currentShardRef.current = name;
    const [shardTasks, master] = await Promise.all([
      fetchShard(name),
      fetchMaster().catch((): MasterResponse => ({})),
    ]);
    setTasks(shardTasks);
    const current = master?.meta?.currentTaskId ?? null;
    let next =
      "Shard: " +
      name.replace("tasks-", "").replace(".json", "") +
      " · " +
      shardTasks.length +
      " tasks";
    if (current) next += " · current " + current;
    setLabel(next);
  }, []);

  // file-change / reconnect → re-fetch shard index + the current shard.
  const sync = useCallback(async () => {
    const index = await fetchShardIndex();
    setShards(index);
    const name = currentShardRef.current || index[0];
    if (name) await loadShard(name);
  }, [loadShard]);

  const { status, snapshot, activityEvents, claudeStatus } = useDashboardStream({
    onSync: () => void sync(),
  });

  useEffect(() => {
    loadNotifSettings();
    maybeRequestPermissionOnce();
    updatePageTitle("idle");
    void sync();
  }, [sync]);

  const selected = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [tasks, selectedId],
  );

  const dot = "live-dot" + (status === "reconnecting" ? " reconnecting" : "");
  const activityEnabled = snapshot?.activityEnabled === true;
  const browserNotifications = snapshot?.browserNotifications !== false;
  const st = activityStatusView(claudeStatus);

  return (
    <>
      <Nav projectName={snapshot?.projectName || ""} />
      <div className="top-bar">
        <div>
          <h1>
            <span className={dot} id="status-dot" />
            Taskflow Dashboard
          </h1>
          <p className="subtitle">{label}</p>
        </div>
        <div className="top-bar-actions">
          {snapshot && !activityEnabled ? (
            <span
              className="engine-chip engine-off"
              title="Set activityEngine.enabled to true in taskflow.config.json to enable"
            >
              Engine: off (config)
            </span>
          ) : null}
          {browserNotifications ? <SettingsPopover /> : null}
        </div>
      </div>

      <div className="layout">
        <div className="main-content">
          {shards.length > 0 ? (
            <ShardNav shards={shards} current={currentShard} onSelect={(n) => void loadShard(n)} />
          ) : null}
          <Stats tasks={tasks} />
          <Kanban tasks={tasks} onOpen={setSelectedId} />

          {activityEnabled ? (
            <div className="act-tabs">
              <div className="act-tab-bar">
                <button
                  className={"act-tab" + (actTab === "claude" ? " active" : "")}
                  onClick={() => setActTab("claude")}
                >
                  Agent Activity <span className={st.cls}>{st.text}</span>
                </button>
                <button
                  className={"act-tab" + (actTab === "recent" ? " active" : "")}
                  onClick={() => setActTab("recent")}
                >
                  Recent Activity
                </button>
              </div>
              <div className="act-pane" style={{ display: actTab === "claude" ? "" : "none" }}>
                <ActivityFeed
                  events={activityEvents}
                  verbosity={snapshot?.verbosity || "both"}
                  hookStatus={snapshot?.hookStatus || "ok"}
                />
              </div>
              <div className="act-pane" style={{ display: actTab === "recent" ? "" : "none" }}>
                <Timeline tasks={tasks} />
              </div>
            </div>
          ) : (
            <div id="timeline">
              <Timeline tasks={tasks} />
            </div>
          )}
        </div>
      </div>

      <DetailPanel task={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
