// N86 — single source of truth for design tokens; N87 adds a `readingTheme`
// (larger type/space) for the detail panel + /task/:id page only. Values are
// lifted verbatim from N85 (styles.css :root + the status/activity hex). This
// object is both the styled-components ThemeProvider value AND the source the
// pure color helpers (taskStatusColor / eventColor / hookEventColor) read from.

export interface Theme {
  color: {
    bg: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    green: string;
    yellow: string;
    red: string;
    purple: string;
    orange: string;
    cyan: string;
    amber: string;
  };
  status: Record<string, string>;
  space: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
  };
  radius: { sm: string; md: string; lg: string; xl: string; "2xl": string; pill: string };
  font: {
    family: string;
    size: {
      xs: string;
      sm: string;
      base: string;
      md: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
    };
    weight: { normal: number; medium: number; semibold: number; bold: number };
  };
}

export const tokens: Theme = {
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
  },
  space: { xs: "4px", sm: "6px", md: "8px", lg: "10px", xl: "12px", "2xl": "16px", "3xl": "24px" },
  radius: { sm: "3px", md: "4px", lg: "6px", xl: "8px", "2xl": "10px", pill: "9999px" },
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
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  },
};

/** The value handed to styled-components' ThemeProvider (the dense dashboard). */
export const theme = tokens;

/**
 * N87 reading mode — larger type + spacing for the detail panel + /task/:id page
 * only, so the markdown docs are comfortable to read. Same colors/radii/weights;
 * just bumped `font.size` + `space`. Applied via a nested ThemeProvider in that
 * subtree, so the dense Kanban/timeline/activity views are unaffected.
 */
export const readingTheme: Theme = {
  ...tokens,
  space: { xs: "6px", sm: "8px", md: "12px", lg: "14px", xl: "16px", "2xl": "20px", "3xl": "32px" },
  font: {
    ...tokens.font,
    size: {
      xs: "12px",
      sm: "13px",
      base: "14px",
      md: "15px",
      lg: "16px",
      xl: "18px",
      "2xl": "22px",
      "3xl": "28px",
    },
  },
};

// Type the styled-components theme as our token object, so `props.theme.*` is
// fully type-checked in every styled component (no casts).
declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
