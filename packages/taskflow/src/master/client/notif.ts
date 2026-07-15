// N231 — notification preferences for the overview settings menu + per-project
// mute. N238 — this is now the SINGLE source of truth for the settings model
// AND the watched-status list: the settings UI (SettingsMenu) and the notifier
// (hub-notify.ts) both import from here, so the two can no longer drift (they
// previously watched 5 vs 8 statuses). Persisted under one localStorage key.

export interface NotifSettings {
  statuses: Record<string, boolean>;
  sound: boolean;
  muteFocused: boolean;
  mutedProjects: string[];
}

const KEY = "tf-notif-settings";

/**
 * The task-status transitions the hub notifies on — the settings menu renders a
 * toggle per entry and the notifier only fires for statuses in this list. Keep
 * the two in lockstep by importing this single list in both.
 */
export const WATCHED_STATUSES = [
  "implemented",
  "approved",
  "fix-needed",
  "fixed",
  "merged",
  "changes-requested",
  "changes-implemented",
  "done",
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
