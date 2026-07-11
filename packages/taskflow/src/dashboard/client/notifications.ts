// Notification + sound layer, ported from dashboard.ts. Settings persist in
// localStorage; sounds prefer the bundled mp3s and fall back to Web-Audio beeps.
import { apiUrl } from "./base.js";

export interface NotifSettings {
  sound: boolean;
  muteFocused: boolean;
}

export const notifSettings: NotifSettings = { sound: true, muteFocused: false };

export function loadNotifSettings(): void {
  try {
    const raw = localStorage.getItem("tf-notif-settings");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NotifSettings>;
      notifSettings.sound = parsed.sound !== false;
      notifSettings.muteFocused = !!parsed.muteFocused;
    }
  } catch {
    /* ignore */
  }
}

export function saveNotifSettings(next: NotifSettings): void {
  notifSettings.sound = next.sound;
  notifSettings.muteFocused = next.muteFocused;
  try {
    localStorage.setItem("tf-notif-settings", JSON.stringify(notifSettings));
  } catch {
    /* ignore */
  }
}

type StatusSound = "idle" | "permission-needed";

function playTone(state: StatusSound): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") void ctx.resume();
    const beep = (freq: number, t: number, dur: number, vol: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t);
      osc.stop(t + dur);
    };
    const now = ctx.currentTime;
    if (state === "idle") {
      beep(880, now, 0.3, 0.2);
      beep(660, now + 0.12, 0.3, 0.15);
    } else {
      beep(660, now, 0.18, 0.3);
      beep(880, now + 0.22, 0.18, 0.3);
      beep(660, now + 0.44, 0.25, 0.3);
    }
    setTimeout(() => {
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
    }, 1200);
  } catch {
    /* ignore */
  }
}

export function playStatusSound(state: StatusSound, soundsEnabled: boolean): void {
  if (!soundsEnabled) return;
  if (notifSettings.sound === false) return;
  // N215 — base-aware so sounds resolve under the proxy (/p/<id>/sounds/…) too.
  const src = apiUrl(state === "idle" ? "/sounds/idle-ping.mp3" : "/sounds/permission-alert.mp3");
  fetch(src, { method: "HEAD" })
    .then((r) => {
      const len = parseInt(r.headers.get("content-length") || "0", 10);
      if (r.ok && len > 0) {
        try {
          new Audio(src).play().catch(() => playTone(state));
        } catch {
          playTone(state);
        }
      } else {
        playTone(state);
      }
    })
    .catch(() => playTone(state));
}

const TITLE_GLYPH: Record<string, string> = {
  active: "⚡",
  idle: "💤",
  done: "✅",
  "awaiting-permission": "🚨",
  "permission-needed": "🚨",
};

export function updatePageTitle(state?: string): void {
  const base = "Taskflow Dashboard";
  document.title = state && TITLE_GLYPH[state] ? TITLE_GLYPH[state] + " " + base : base;
}

export function requestNotifPermission(callback?: () => void): void {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    callback?.();
    return;
  }
  if (Notification.permission === "denied") return;
  void Notification.requestPermission().then((perm) => {
    if (perm === "granted") callback?.();
  });
}

export function permissionHint(): string {
  if (!("Notification" in window)) return "Notifications not supported in this browser.";
  if (Notification.permission === "denied")
    return "Permission denied. Allow notifications in browser settings.";
  if (Notification.permission === "default") return "Click Sound or Mute to enable notifications.";
  return "";
}

export function fireDesktopNotif(projectName: string, soundsEnabled: boolean): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (notifSettings.muteFocused && !document.hidden) return;
  const title = (projectName ? projectName + ": " : "") + "Done";
  const sound = soundsEnabled && notifSettings.sound !== false;
  try {
    new Notification(title, { silent: !sound });
  } catch {
    /* ignore */
  }
}

export function fireStatusDesktopNotif(
  toStatus: string,
  projectName: string,
  soundsEnabled: boolean,
): void {
  if (toStatus !== "done" && toStatus !== "awaiting-permission") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (notifSettings.muteFocused && !document.hidden) return;
  const label = toStatus === "done" ? "Done" : "Permission required";
  const title = (projectName ? projectName + ": " : "") + label;
  const sound = soundsEnabled && notifSettings.sound !== false;
  try {
    new Notification(title, { silent: !sound });
  } catch {
    /* ignore */
  }
}

let lastPermissionAlertAt = 0;
export function firePermissionAlert(
  soundsEnabled: boolean,
  browserNotifications: boolean,
  projectName: string,
): void {
  const now = Date.now();
  if (now - lastPermissionAlertAt < 2000) return;
  lastPermissionAlertAt = now;
  playStatusSound("permission-needed", soundsEnabled);
  if (browserNotifications)
    fireStatusDesktopNotif("awaiting-permission", projectName, soundsEnabled);
}

/** On first load, request notification permission once (mirrors legacy behavior). */
export function maybeRequestPermissionOnce(): void {
  if ("Notification" in window && Notification.permission === "default") {
    let asked = false;
    try {
      asked = !!localStorage.getItem("tf-notif-asked");
    } catch {
      /* ignore */
    }
    if (!asked) {
      requestNotifPermission();
      try {
        localStorage.setItem("tf-notif-asked", "1");
      } catch {
        /* ignore */
      }
    }
  }
}
