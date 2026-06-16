import type { ReactNode } from "react";
import styled from "styled-components";
import {
  badgeClass,
  hexToRgb,
  isCanonicalStatus,
  statusColor,
  statusLabel,
  type FlowStatus,
} from "../lib.js";

// bg is badge-specific; fg uses the token-driven CSS vars (var(--x), emitted by
// GlobalStyle) — identical to the original .badge-* rules.
const BADGE_TONES: Record<string, { bg: string; fg: string }> = {
  ready: { bg: "#1e3a5f", fg: "var(--cyan)" },
  progress: { bg: "#3b2f06", fg: "var(--yellow)" },
  review: { bg: "#2d1b4e", fg: "var(--purple)" },
  fix: { bg: "#3b1111", fg: "var(--red)" },
  approved: { bg: "#0a3622", fg: "var(--green)" },
  merged: { bg: "#1a1a2e", fg: "#818cf8" },
  pushed: { bg: "#2a1a06", fg: "var(--orange)" },
};

export function statusTone(status: string): string {
  return badgeClass(status).replace("badge-", "");
}

const StyledBadge = styled.span<{ $tone: string }>`
  font-size: ${(p) => p.theme.font.size.xs};
  padding: 1px 6px;
  border-radius: ${(p) => p.theme.radius.md};
  font-weight: ${(p) => p.theme.font.weight.medium};
  background: ${(p) => (BADGE_TONES[p.$tone] ?? BADGE_TONES.pushed).bg};
  color: ${(p) => (BADGE_TONES[p.$tone] ?? BADGE_TONES.pushed).fg};
`;

// N130 — a non-canonical flow status carrying its own hex color is styled from
// that color (translucent fill + hex text), mirroring the timeline chips.
const HexBadge = styled.span<{ $color: string }>`
  font-size: ${(p) => p.theme.font.size.xs};
  padding: 1px 6px;
  border-radius: ${(p) => p.theme.radius.md};
  font-weight: ${(p) => p.theme.font.weight.medium};
  background: ${(p) => `rgba(${hexToRgb(p.$color)}, 0.18)`};
  color: ${(p) => p.$color};
`;

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/**
 * N130 — status badge. Canonical statuses keep today's grouped tones (so a
 * default-only board is byte-identical); a custom flow status (N128) renders
 * its `title` and, when it declares a valid hex `color`, that color. `statuses`
 * is the relevant flow's status set; omit it for non-task badges (verdicts,
 * incident states) — they resolve canonically as before.
 */
export function Badge({
  status,
  statuses,
  children,
}: {
  status: string;
  statuses?: FlowStatus[];
  children?: ReactNode;
}) {
  const label = children ?? statusLabel(status, statuses);
  const custom = !isCanonicalStatus(status) ? statusColor(status, statuses) : undefined;
  if (custom && HEX6.test(custom)) {
    return <HexBadge $color={custom}>{label}</HexBadge>;
  }
  return <StyledBadge $tone={statusTone(status)}>{label}</StyledBadge>;
}
