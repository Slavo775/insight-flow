// N238 — the project dashboard no longer fires browser notifications or sounds.
// The hub (master origin, /hub-notify.js) is the single notifier for every
// project viewed through it. Opening a project dashboard directly (or with the
// master down) gives a working-but-silent dashboard by design. All that remains
// here is the visual tab-title glyph.

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
