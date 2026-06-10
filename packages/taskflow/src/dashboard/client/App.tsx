import { useEffect, useMemo, useRef, useState } from "react";
import type { ClaudeStatus } from "./activity.js";
import { ActivityFeed } from "./ActivityFeed.js";
import { DetailPanel } from "./DetailPanel.js";
import { Button, Text } from "./components.js";
import {
  loadNotifSettings,
  maybeRequestPermissionOnce,
  notifSettings,
  permissionHint,
  saveNotifSettings,
  updatePageTitle,
} from "./notifications.js";
import { useDashboardStore } from "./store.js";
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
      <Button
        $variant="icon"
        type="button"
        title="Notification settings"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </Button>
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
  const [actTab, setActTab] = useState<"claude" | "recent">("claude");

  // Global state from the Zustand store (fed by the SSE stream).
  const connection = useDashboardStore((s) => s.connection);
  const agentStatus = useDashboardStore((s) => s.agentStatus);
  const snapshot = useDashboardStore((s) => s.snapshot);
  const activityEvents = useDashboardStore((s) => s.activityEvents);
  const shards = useDashboardStore((s) => s.shards);
  const currentShard = useDashboardStore((s) => s.currentShard);
  const tasks = useDashboardStore((s) => s.tasks);
  const label = useDashboardStore((s) => s.label);
  const selectedTaskId = useDashboardStore((s) => s.selectedTaskId);
  const loadShard = useDashboardStore((s) => s.loadShard);
  const selectTask = useDashboardStore((s) => s.selectTask);

  useDashboardStream();

  useEffect(() => {
    loadNotifSettings();
    maybeRequestPermissionOnce();
    updatePageTitle("idle");
    void useDashboardStore.getState().sync();
  }, []);

  const selected = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const dot = "live-dot" + (connection === "reconnecting" ? " reconnecting" : "");
  const activityEnabled = snapshot?.activityEnabled === true;
  const browserNotifications = snapshot?.browserNotifications !== false;
  const st = activityStatusView(agentStatus);

  return (
    <>
      <Nav projectName={snapshot?.projectName || ""} />
      <div className="top-bar">
        <div>
          <Text as="h1" $variant="h1">
            <span className={dot} id="status-dot" />
            Taskflow Dashboard
          </Text>
          <Text as="p" $variant="subtitle">
            {label}
          </Text>
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
          <Kanban tasks={tasks} onOpen={selectTask} />

          {activityEnabled ? (
            <div className="act-tabs">
              <div className="act-tab-bar">
                <Button
                  $variant="tab"
                  $active={actTab === "claude"}
                  onClick={() => setActTab("claude")}
                >
                  Agent Activity <span className={st.cls}>{st.text}</span>
                </Button>
                <Button
                  $variant="tab"
                  $active={actTab === "recent"}
                  onClick={() => setActTab("recent")}
                >
                  Recent Activity
                </Button>
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

      <DetailPanel task={selected} onClose={() => selectTask(null)} />
    </>
  );
}
