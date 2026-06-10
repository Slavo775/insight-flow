import { useEffect, useRef, useState } from "react";
import type { ActivityEvent, ClaudeStatus } from "./activity.js";
import { ACTIVITY_CAP, claudeStatusFromEvent, eventKey } from "./activity.js";
import {
  fireDesktopNotif,
  firePermissionAlert,
  fireStatusDesktopNotif,
  playStatusSound,
  updatePageTitle,
} from "./notifications.js";

export type ConnStatus = "connected" | "reconnecting";

export interface DashboardSnapshot {
  activityEnabled: boolean;
  hookStatus: string;
  projectName: string;
  browserNotifications: boolean;
  soundsEnabled: boolean;
  verbosity: string;
}

interface StreamHandlers {
  /** Reload the current board state (file-change frame, and on reconnect). */
  onSync: () => void;
}

interface SnapshotFrame {
  activity?: ActivityEvent[];
  hookStatus?: string;
  configEnabled?: boolean;
  projectName?: string;
  browserNotifications?: boolean;
  soundsEnabled?: boolean;
  verbosity?: string;
}

/**
 * Subscribes to the dashboard SSE stream (/sse) and surfaces connection status,
 * the server snapshot (config + hook status), the live activity feed, and the
 * derived agent status. Status/notification frames drive page-title glyphs,
 * sounds, and browser notifications — matching the legacy dashboard.
 */
export function useDashboardStream({ onSync }: StreamHandlers): {
  status: ConnStatus;
  snapshot: DashboardSnapshot | null;
  activityEvents: ActivityEvent[];
  claudeStatus: ClaudeStatus | null;
} {
  const [status, setStatus] = useState<ConnStatus>("reconnecting");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatus | null>("idle");

  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  // Latest config for use inside notification handlers (avoids stale closures).
  const cfgRef = useRef<DashboardSnapshot | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const es = new EventSource("/sse");
    let syncedOnce = false;

    es.onopen = () => {
      setStatus("connected");
      if (syncedOnce) onSyncRef.current();
      syncedOnce = true;
    };
    es.onerror = () => setStatus("reconnecting");

    es.addEventListener("snapshot", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as SnapshotFrame;
      const cfg: DashboardSnapshot = {
        activityEnabled: data.configEnabled === true,
        hookStatus: data.hookStatus || "ok",
        projectName: data.projectName || "",
        browserNotifications: data.browserNotifications !== false,
        soundsEnabled: data.soundsEnabled !== false,
        verbosity: data.verbosity || "both",
      };
      cfgRef.current = cfg;
      setSnapshot(cfg);
      // Reset the feed to the server's authoritative state on every snapshot
      // (incl. reconnects) so stale client events are not duplicated.
      seenRef.current = new Set();
      const fresh: ActivityEvent[] = [];
      for (const ev of data.activity || []) {
        const key = ev.id || eventKey(ev);
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        fresh.unshift(ev);
      }
      setActivityEvents(fresh.slice(0, ACTIVITY_CAP));
    });

    es.addEventListener("activity", (e) => {
      const ev = JSON.parse((e as MessageEvent).data) as ActivityEvent;
      const key = ev.id || eventKey(ev);
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      const derived = claudeStatusFromEvent(ev);
      if (derived) setClaudeStatus(derived);
      setActivityEvents((prev) => [ev, ...prev].slice(0, ACTIVITY_CAP));
    });

    es.addEventListener("file-change", () => onSyncRef.current());

    es.addEventListener("status", (e) => {
      const frame = JSON.parse((e as MessageEvent).data) as { to?: string };
      if (!frame || typeof frame.to !== "string") return;
      const cfg = cfgRef.current;
      updatePageTitle(frame.to);
      if (frame.to === "done") {
        playStatusSound("idle", cfg?.soundsEnabled !== false);
        if (cfg?.browserNotifications !== false)
          fireStatusDesktopNotif("done", cfg?.projectName || "", cfg?.soundsEnabled !== false);
      } else if (frame.to === "awaiting-permission") {
        firePermissionAlert(
          cfg?.soundsEnabled !== false,
          cfg?.browserNotifications !== false,
          cfg?.projectName || "",
        );
      }
    });

    es.addEventListener("agent-done", () => {
      const cfg = cfgRef.current;
      if (cfg?.browserNotifications !== false)
        fireDesktopNotif(cfg?.projectName || "", cfg?.soundsEnabled !== false);
    });
    es.addEventListener("agent-permission", () => {
      const cfg = cfgRef.current;
      firePermissionAlert(
        cfg?.soundsEnabled !== false,
        cfg?.browserNotifications !== false,
        cfg?.projectName || "",
      );
    });

    return () => es.close();
  }, []);

  return { status, snapshot, activityEvents, claudeStatus };
}
