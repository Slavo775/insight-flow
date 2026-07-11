import { useEffect } from "react";
import type { ActivityEvent } from "./activity.js";
import { claudeStatusFromEvent } from "./activity.js";
import { apiUrl } from "./base.js";
import {
  fireDesktopNotif,
  firePermissionAlert,
  fireStatusDesktopNotif,
  playStatusSound,
  updatePageTitle,
} from "./notifications.js";
import { useDashboardStore } from "./store.js";
import { invalidateRegistry } from "./registry.js";
import { invalidateFlows } from "./flow-columns.js";

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
 * Subscribes to the dashboard SSE stream (/sse) and writes every frame into the
 * Zustand store: connection status, the server snapshot (config + activity feed),
 * and the derived agent status. Status/notification frames also drive page-title
 * glyphs, sounds, and browser notifications — matching the legacy dashboard.
 * Returns nothing; components read state from the store.
 */
export function useDashboardStream(): void {
  useEffect(() => {
    const es = new EventSource(apiUrl("/sse"));
    let syncedOnce = false;
    const store = () => useDashboardStore.getState();

    es.onopen = () => {
      store().setConnection("connected");
      if (syncedOnce) void store().sync();
      syncedOnce = true;
    };
    es.onerror = () => store().setConnection("reconnecting");

    es.addEventListener("snapshot", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as SnapshotFrame;
      store().applySnapshot(
        {
          activityEnabled: data.configEnabled === true,
          hookStatus: data.hookStatus || "ok",
          projectName: data.projectName || "",
          browserNotifications: data.browserNotifications !== false,
          soundsEnabled: data.soundsEnabled !== false,
          verbosity: data.verbosity || "both",
        },
        data.activity || [],
      );
    });

    es.addEventListener("activity", (e) => {
      const ev = JSON.parse((e as MessageEvent).data) as ActivityEvent;
      const derived = claudeStatusFromEvent(ev);
      if (derived) store().setAgentStatus(derived);
      store().addActivityEvent(ev);
    });

    es.addEventListener("file-change", () => void store().sync());

    // N103 review-fix — a custom-definition CRUD write (possibly from another
    // tab) invalidates the shared registry cache so the next /module, /agent,
    // or /project navigation refetches fresh data instead of serving stale.
    es.addEventListener("custom-defs-changed", () => {
      invalidateRegistry();
      invalidateFlows(); // N129/N130 — a flow's statuses may have changed
    });

    es.addEventListener("status", (e) => {
      const frame = JSON.parse((e as MessageEvent).data) as { to?: string };
      if (!frame || typeof frame.to !== "string") return;
      const cfg = store().snapshot;
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
      const cfg = store().snapshot;
      if (cfg?.browserNotifications !== false)
        fireDesktopNotif(cfg?.projectName || "", cfg?.soundsEnabled !== false);
    });
    es.addEventListener("agent-permission", () => {
      const cfg = store().snapshot;
      firePermissionAlert(
        cfg?.soundsEnabled !== false,
        cfg?.browserNotifications !== false,
        cfg?.projectName || "",
      );
    });

    return () => es.close();
  }, []);
}
