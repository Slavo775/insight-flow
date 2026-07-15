// N238 — the shared hub notification client, built (vite lib, IIFE) into
// dist/master/hub-notify.js and served at /hub-notify.js. Injected into EVERY
// hub page (the overview AND every proxied /project/<id>/ shell), so SW-backed
// notifications fire from anywhere in the hub while backgrounded/installed.
//
// This replaces the former MASTER_NOTIFY_JS string blob in server.ts. It now
// imports the ONE settings model + watched-status list from ./notif.ts, so the
// notifier and the settings UI can no longer drift (they previously watched 5 vs
// 8 statuses).
//
// The project dashboards no longer notify at all (N238) — this is the single
// notifier for the whole hub.
import { WATCHED_STATUSES, loadNotifSettings, isMuted, type NotifSettings } from "./notif.js";

interface ProjectState {
  claudeStatus?: string;
  currentTaskId?: string | null;
  currentTaskStatus?: string | null;
}
interface ProjectView {
  id: string;
  projectId: string;
  label: string;
  state?: ProjectState;
}

const WATCHED = WATCHED_STATUSES as readonly string[];

(function () {
  let settings: NotifSettings = loadNotifSettings();
  window.addEventListener("storage", (e) => {
    if (e.key === "tf-notif-settings") settings = loadNotifSettings();
  });

  let swReg: ServiceWorkerRegistration | null = null;
  const prevTask: Record<string, Record<string, string>> = {};
  const prevClaude: Record<string, string> = {};

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((r) => {
        swReg = r;
      })
      .catch(() => {});
  }
  try {
    if (
      "Notification" in window &&
      Notification.permission === "default" &&
      !localStorage.getItem("tf-notif-asked")
    ) {
      void Notification.requestPermission();
      localStorage.setItem("tf-notif-asked", "1");
    }
  } catch {
    /* ignore */
  }

  function notify(title: string, url: string, tag: string): void {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    // A stable tag so the same transition seen by multiple open hub pages
    // collapses into one OS notification.
    const opts: NotificationOptions = {
      silent: true,
      data: { url: url || "/" },
      tag: tag || title,
    };
    (opts as { renotify?: boolean }).renotify = true;
    if (swReg) {
      try {
        void swReg.showNotification(title, opts);
        return;
      } catch {
        /* fall through to page Notification */
      }
    }
    try {
      new Notification(title, opts);
    } catch {
      /* ignore */
    }
  }

  // A richer multi-note chime (sine melody with a gain ramp). alert=true →
  // permission, alert=false → idle/done.
  function tone(alert: boolean): void {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const c = new AC();
      if (c.state === "suspended")
        try {
          void c.resume();
        } catch {
          /* ignore */
        }
      const beep = (f: number, t: number, d: number, v: number): void => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g);
        g.connect(c.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.start(t);
        o.stop(t + d);
      };
      const n = c.currentTime;
      if (alert) {
        beep(660, n, 0.18, 0.3);
        beep(880, n + 0.22, 0.18, 0.3);
        beep(660, n + 0.44, 0.25, 0.3);
      } else {
        beep(880, n, 0.3, 0.2);
        beep(660, n + 0.12, 0.3, 0.15);
      }
      setTimeout(() => {
        try {
          void c.close();
        } catch {
          /* ignore */
        }
      }, 1200);
    } catch {
      /* ignore */
    }
  }

  function sound(alert: boolean): void {
    if (settings.sound === false) return;
    if (settings.muteFocused && !document.hidden) return;
    // Attempt the bundled mp3 first; fall back to the chime only when playback is
    // blocked (e.g. before a user gesture per autoplay policy).
    const src = alert ? "/sounds/permission-alert.mp3" : "/sounds/idle-ping.mp3";
    try {
      void new Audio(src).play().catch(() => tone(alert));
    } catch {
      tone(alert);
    }
  }

  function track(p: ProjectView): void {
    const s = p.state || {};
    if (s.currentTaskId && s.currentTaskStatus) {
      if (!prevTask[p.id]) prevTask[p.id] = {};
      prevTask[p.id][s.currentTaskId] = s.currentTaskStatus;
    }
    if (s.claudeStatus !== undefined) prevClaude[p.id] = s.claudeStatus;
  }

  function onUpdate(p: ProjectView): void {
    if (!p || !p.id) return;
    if (settings.muteFocused && !document.hidden) {
      track(p);
      return;
    }
    if (isMuted(settings, p.id)) {
      track(p);
      return;
    }
    const s = p.state || {};
    const url = "/project/" + encodeURIComponent(p.projectId) + "/";
    if (s.currentTaskId && s.currentTaskStatus) {
      const prev = (prevTask[p.id] || {})[s.currentTaskId];
      if (
        prev &&
        prev !== s.currentTaskStatus &&
        settings.statuses[s.currentTaskStatus] !== false &&
        WATCHED.includes(s.currentTaskStatus)
      ) {
        notify(
          p.label + ": " + s.currentTaskId + " -> " + s.currentTaskStatus,
          url,
          p.id + ":" + s.currentTaskId + ":" + s.currentTaskStatus,
        );
        sound(false);
      }
    }
    const cs = s.claudeStatus;
    const pc = prevClaude[p.id];
    // Only on a REAL transition (pc set): the first frame after connect just
    // seeds prevClaude, so it no longer fires a spurious "needs permission" on
    // every hub page load. "Claude finished" is active->done only.
    if (cs && pc !== undefined && cs !== pc) {
      if (cs === "done" && pc === "active") {
        notify(p.label + ": Claude finished", url, p.id + ":done");
        sound(false);
      } else if (cs === "permission-required" || cs === "awaiting-permission") {
        notify(p.label + ": needs permission", url, p.id + ":perm");
        sound(true);
      }
    }
    track(p);
  }

  try {
    const es = new EventSource("/events");
    es.addEventListener("project-update", (e) => {
      try {
        onUpdate(JSON.parse((e as MessageEvent).data) as ProjectView);
      } catch {
        /* ignore malformed frame */
      }
    });
  } catch {
    /* ignore */
  }
})();
