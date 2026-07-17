import type { ReactNode } from "react";
import styled from "styled-components";

// N231 — the server-state pill (Active / Permission required / Idle / …), matching
// the Lovable prototype: a bordered pill with a leading icon. The `border` color
// also drives the ProjectCard left accent, and `rowBg` is the faint row tint —
// exported via statusToneColors so the card stays in sync. Every fg/bg pair meets
// WCAG AA for the small pill text.
// N248 — the log-level tones (error/warning/info) share this same pill + tone
// mechanism as the server-state tones, so the /logs page reuses StatusPill and
// statusToneColors (for the row border + tint) instead of a parallel component.
export type StatusTone =
  | "active"
  | "permission"
  | "awaiting-permission"
  | "done"
  | "idle"
  | "error"
  | "warning"
  | "info";

export interface ToneColors {
  /** Pill border + card left accent. */
  border: string;
  /** Pill background. */
  bg: string;
  /** Pill text/icon. */
  fg: string;
  /** Faint card row background tint. */
  rowBg: string;
}

const TONES: Record<StatusTone, ToneColors> = {
  active: {
    border: "oklch(0.78 0.19 150)",
    bg: "oklch(0.28 0.09 150)",
    fg: "oklch(0.95 0.15 155)",
    rowBg: "#12281c",
  },
  permission: {
    border: "oklch(0.82 0.17 85)",
    bg: "oklch(0.32 0.11 85)",
    fg: "oklch(0.96 0.16 95)",
    rowBg: "#241f0c",
  },
  "awaiting-permission": {
    border: "oklch(0.82 0.17 85)",
    bg: "oklch(0.32 0.11 85)",
    fg: "oklch(0.96 0.16 95)",
    rowBg: "#241f0c",
  },
  done: {
    border: "oklch(0.78 0.19 150)",
    bg: "oklch(0.28 0.09 150)",
    fg: "oklch(0.95 0.15 155)",
    rowBg: "oklch(0.21 0.02 260)",
  },
  idle: {
    border: "oklch(0.55 0.02 260)",
    bg: "oklch(0.26 0.02 260)",
    fg: "oklch(0.92 0.02 260)",
    rowBg: "oklch(0.21 0.02 260)",
  },
  // N248 — log levels (exact oklch from the Lovable /logs design). `bg` is the
  // active-chip fill; `rowBg` is the faint row tint behind a log entry.
  error: {
    border: "oklch(0.55 0.18 25 / 0.6)",
    bg: "oklch(0.32 0.12 25 / 0.28)",
    fg: "oklch(0.92 0.05 25)",
    rowBg: "oklch(0.32 0.12 25 / 0.28)",
  },
  warning: {
    border: "oklch(0.6 0.15 85 / 0.6)",
    bg: "oklch(0.32 0.09 85 / 0.28)",
    fg: "oklch(0.94 0.06 85)",
    rowBg: "oklch(0.32 0.09 85 / 0.28)",
  },
  info: {
    border: "oklch(0.55 0.1 240 / 0.55)",
    bg: "oklch(0.28 0.05 240 / 0.32)",
    fg: "oklch(0.94 0.03 240)",
    rowBg: "oklch(0.28 0.05 240 / 0.32)",
  },
};

export function statusToneColors(tone: StatusTone): ToneColors {
  return TONES[tone];
}

const Pill = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  height: 30px;
  font-size: 12px;
  font-weight: ${(p) => p.theme.font.weight.semibold};
  padding: 0 10px;
  border-radius: ${(p) => p.theme.radius.md};
  border: 1px solid ${(p) => TONES[p.$tone].border};
  background: ${(p) => TONES[p.$tone].bg};
  color: ${(p) => TONES[p.$tone].fg};
  white-space: nowrap;
`;

export function StatusPill({
  tone,
  icon,
  children,
}: {
  tone: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Pill $tone={tone}>
      {icon}
      {children}
    </Pill>
  );
}
