// N231 — notification preferences for the overview settings menu + per-project
// mute. The overview only READS/WRITES these; the actual notifications are fired
// by the shared /hub-notify.js client (N225), which reads the same localStorage
// key. So this module is purely the settings UI's model, matching overview.ts.

export interface NotifSettings {
  statuses: Record<string, boolean>;
  sound: boolean;
  muteFocused: boolean;
  mutedProjects: string[];
}

const KEY = "tf-notif-settings";

/** The five task-status transitions the settings menu can toggle. */
export const WATCHED_STATUSES = [
  "implemented",
  "approved",
  "fix-needed",
  "merged",
  "changes-requested",
] as const;

export function loadNotifSettings(): NotifSettings {
  const base: NotifSettings = {
    statuses: {},
    sound: true,
    muteFocused: false,
    mutedProjects: [],
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<NotifSettings>) };
  } catch {
    /* ignore malformed / unavailable storage */
  }
  return base;
}

export function saveNotifSettings(s: NotifSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function isMuted(s: NotifSettings, id: string): boolean {
  return s.mutedProjects.indexOf(id) >= 0;
}

export function toggleMuted(s: NotifSettings, id: string): NotifSettings {
  const muted = isMuted(s, id);
  return {
    ...s,
    mutedProjects: muted ? s.mutedProjects.filter((x) => x !== id) : [...s.mutedProjects, id],
  };
}
