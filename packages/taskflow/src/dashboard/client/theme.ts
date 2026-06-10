// N86 — single source of truth for design tokens. Values are lifted verbatim
// from N85 (styles.css :root + the status/activity hex that was duplicated in
// lib.ts / activity.ts) so the migration is behavior-preserving. This object is
// both the styled-components ThemeProvider value AND the source the pure color
// helpers (taskStatusColor / eventColor / hookEventColor) read from — so there
// is exactly one place colors live.

export const tokens = {
  color: {
    bg: "#0a0a0a",
    surface: "#141414",
    border: "#262626",
    text: "#e5e5e5",
    textMuted: "#737373",
    accent: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    red: "#ef4444",
    purple: "#a855f7",
    orange: "#f97316",
    cyan: "#06b6d4",
    amber: "#f59e0b", // activity "Activity"-tool rows (not in the base palette)
  },
  // Task status → color (was lib.ts STATUS_COLORS). Keys are the raw status strings.
  status: {
    ready: "#94a3b8",
    "in-progress": "#f59e0b",
    implemented: "#06b6d4",
    reviewing: "#a855f7",
    approved: "#22c55e",
    "fix-needed": "#ef4444",
    fixing: "#dc2626",
    fixed: "#22c55e",
    pushed: "#16a34a",
    merged: "#10b981",
    "changes-requested": "#f97316",
    "changes-implementing": "#fb923c",
    "changes-implemented": "#14b8a6",
  } as Record<string, string>,
  space: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "10px",
    xl: "12px",
    "2xl": "16px",
    "3xl": "24px",
  },
  radius: {
    sm: "3px",
    md: "4px",
    lg: "6px",
    xl: "8px",
    "2xl": "10px",
    pill: "9999px",
  },
  font: {
    family: "'SF Mono', 'Fira Code', monospace",
    size: {
      xs: "10px",
      sm: "11px",
      base: "12px",
      md: "13px",
      lg: "14px",
      xl: "16px",
      "2xl": "18px",
      "3xl": "24px",
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
} as const;

export type Tokens = typeof tokens;

/** The value handed to styled-components' ThemeProvider. */
export const theme = tokens;
