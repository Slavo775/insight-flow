import type { ReactNode } from "react";
import styled from "styled-components";
import { badgeClass } from "../lib.js";

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

export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return <StyledBadge $tone={statusTone(status)}>{children ?? status}</StyledBadge>;
}
