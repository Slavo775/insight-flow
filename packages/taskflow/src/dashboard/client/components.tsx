// N86 shared primitives — styled-components sourced from the theme tokens.
// Visual output is intentionally identical to the N85 CSS classes they replace
// (a behavior-preserving refactor). Transient ($-prefixed) props are not
// forwarded to the DOM.
import type { ReactNode } from "react";
import styled, { css } from "styled-components";
import { badgeClass } from "./lib.js";

/* ---------------------------------------------------------------- Button --- */

export type ButtonVariant = "nav" | "tab" | "icon" | "close" | "docTab";

const buttonVariants = {
  nav: css`
    background: ${(p) => p.theme.color.surface};
    border: 1px solid ${(p) => p.theme.color.border};
    color: ${(p) => p.theme.color.text};
    padding: 4px 12px;
    border-radius: ${(p) => p.theme.radius.md};
    font-size: ${(p) => p.theme.font.size.base};
    &:hover {
      border-color: ${(p) => p.theme.color.accent};
    }
    &:disabled {
      opacity: 0.3;
      cursor: default;
    }
  `,
  tab: css<{ $active?: boolean }>`
    flex: 1;
    background: none;
    border: none;
    color: ${(p) => (p.$active ? p.theme.color.text : p.theme.color.textMuted)};
    font-size: ${(p) => p.theme.font.size.md};
    padding: 10px 0;
    border-bottom: 2px solid ${(p) => (p.$active ? p.theme.color.accent : "transparent")};
    margin-bottom: -2px;
    font-weight: ${(p) => (p.$active ? p.theme.font.weight.semibold : p.theme.font.weight.normal)};
    transition:
      color 0.15s,
      border-color 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${(p) => p.theme.space.md};
    &:hover {
      color: ${(p) => p.theme.color.text};
    }
  `,
  icon: css`
    background: ${(p) => p.theme.color.surface};
    border: 1px solid ${(p) => p.theme.color.border};
    color: ${(p) => p.theme.color.textMuted};
    padding: 5px 10px;
    border-radius: ${(p) => p.theme.radius.md};
    font-size: ${(p) => p.theme.font.size.lg};
    line-height: 1;
    &:hover {
      border-color: ${(p) => p.theme.color.accent};
      color: ${(p) => p.theme.color.text};
    }
  `,
  close: css`
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: ${(p) => p.theme.color.textMuted};
    font-size: ${(p) => p.theme.font.size["2xl"]};
  `,
  docTab: css<{ $active?: boolean }>`
    background: ${(p) => (p.$active ? p.theme.color.accent : p.theme.color.surface)};
    border: 1px solid ${(p) => (p.$active ? p.theme.color.accent : p.theme.color.border)};
    color: ${(p) => (p.$active ? "#fff" : p.theme.color.textMuted)};
    font-size: ${(p) => p.theme.font.size.sm};
    padding: 4px 10px;
    border-radius: ${(p) => p.theme.radius.md};
    &:hover {
      border-color: ${(p) => p.theme.color.accent};
      color: ${(p) => (p.$active ? "#fff" : p.theme.color.text)};
    }
  `,
};

export const Button = styled.button<{ $variant: ButtonVariant; $active?: boolean }>`
  font-family: inherit;
  cursor: pointer;
  ${(p) => buttonVariants[p.$variant]}
`;

/* ----------------------------------------------------------------- Badge --- */

// Task/verdict status badge backgrounds (component-local; foregrounds come from
// tokens). Keyed by the tone returned from badgeClass(status) minus "badge-".
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

/** Status/verdict badge — pass the raw status string; tone is derived. */
export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return <StyledBadge $tone={statusTone(status)}>{children ?? status}</StyledBadge>;
}

/* -------------------------------------------------------------- Severity --- */

const SEVERITY: Record<string, { bg: string; fg: string }> = {
  critical: { bg: "#4a0f0f", fg: "#fca5a5" },
  high: { bg: "#3b1111", fg: "#ef4444" },
  medium: { bg: "#3b2f06", fg: "#eab308" },
  low: { bg: "#1e3a5f", fg: "#06b6d4" },
};

export const Severity = styled.span<{ $level: string }>`
  font-size: ${(p) => p.theme.font.size.xs};
  padding: 1px 6px;
  border-radius: ${(p) => p.theme.radius.sm};
  font-weight: ${(p) => p.theme.font.weight.medium};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${(p) => (SEVERITY[p.$level] ?? SEVERITY.medium).bg};
  color: ${(p) => (SEVERITY[p.$level] ?? SEVERITY.medium).fg};
`;

/* ------------------------------------------------------------------ Card --- */

export const Card = styled.div`
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: 10px 12px;
  margin-bottom: ${(p) => p.theme.space.md};
  cursor: default;
  transition: border-color 0.15s;
  &:hover {
    border-color: ${(p) => p.theme.color.accent};
  }
`;

export const CardId = styled.div`
  font-size: ${(p) => p.theme.font.size.sm};
  font-weight: ${(p) => p.theme.font.weight.bold};
  color: ${(p) => p.theme.color.accent};
`;

export const CardTitle = styled.div`
  font-size: ${(p) => p.theme.font.size.base};
  margin-top: ${(p) => p.theme.space.xs};
  line-height: 1.4;
`;

export const CardMeta = styled.div`
  font-size: ${(p) => p.theme.font.size.xs};
  color: ${(p) => p.theme.color.textMuted};
  margin-top: ${(p) => p.theme.space.sm};
  display: flex;
  gap: ${(p) => p.theme.space.md};
`;

/* ------------------------------------------------------------------ Chip --- */

export const Chip = styled.span`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${(p) => p.theme.color.border};
  padding: 1px 6px;
  border-radius: ${(p) => p.theme.radius.sm};
  font-size: ${(p) => p.theme.font.size.xs};
  color: ${(p) => p.theme.color.textMuted};
`;
