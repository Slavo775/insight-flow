import { useEffect } from "react";
import type { ActivityEvent } from "./activity.js";
import type { ClaudeStatus } from "../../core/activity-status.js";
import { claudeStatusFromProjectStatus } from "../../core/activity-status.js";
import type { ProjectStatus } from "../../core/types.js";
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
  // N227 — server-derived agent status; seeds the badge on first load.
  agentStatus?: ClaudeStatus;
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
// N228 — coalesce a burst of file-change frames (rapid writes during active
// agent work) into at most one re-sync per interval. Without this, every frame
// triggered a full index+shard re-fetch in every open tab, piling load onto a
// server that may already be busy.
const FILE_CHANGE_DEBOUNCE_MS = 400;

export function useDashboardStream(): void {
  useEffect(() => {
    const es = new EventSource(apiUrl("/sse"));
    let syncedOnce = false;
    let fileChangeTimer: ReturnType<typeof setTimeout> | null = null;
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
        data.agentStatus,
      );
    });

    es.addEventListener("activity", (e) => {
      const ev = JSON.parse((e as MessageEvent).data) as ActivityEvent;
      // N227 — the badge no longer derives status from activity rows here; the
      // server is the single source of truth and pushes it via `status` frames.
      store().addActivityEvent(ev);
    });

    es.addEventListener("file-change", () => {
      if (fileChangeTimer) return; // a re-sync is already scheduled for this burst
      fileChangeTimer = setTimeout(() => {
        fileChangeTimer = null;
        void store().sync();
      }, FILE_CHANGE_DEBOUNCE_MS);
    });

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
      // N227 — reflect the server's status transition on the badge (single
      // source of truth). `to` is always one of the four ProjectStatus values.
      store().setAgentStatus(claudeStatusFromProjectStatus(frame.to as ProjectStatus));
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

    return () => {
      es.close();
      if (fileChangeTimer) clearTimeout(fileChangeTimer);
    };
  }, []);
}
