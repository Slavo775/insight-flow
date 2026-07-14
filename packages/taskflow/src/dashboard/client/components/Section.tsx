import type { ReactNode } from "react";
import styled from "styled-components";

const StyledSection = styled.div`
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

// N231 — "label" (default) is the dense dashboard style (small, uppercase, muted);
// "heading" is the master overview's larger Lovable heading (16px / 600 / 24px,
// normal case, full text color).
export type SectionTitleVariant = "label" | "heading";

const SectionHead = styled.h3<{ $variant: SectionTitleVariant }>`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  margin-bottom: ${(p) => p.theme.space.lg};
  color: ${(p) => (p.$variant === "heading" ? p.theme.color.text : p.theme.color.textMuted)};
  ${(p) =>
    p.$variant === "heading"
      ? `
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
  `
      : `
    font-size: ${p.theme.font.size.sm};
    text-transform: uppercase;
    letter-spacing: 0.06em;
  `}
`;

const SectionCount = styled.span`
  background: ${(p) => p.theme.color.border};
  color: ${(p) => p.theme.color.textMuted};
  border-radius: ${(p) => p.theme.radius["2xl"]};
  padding: 1px 7px;
  font-size: ${(p) => p.theme.font.size.xs};
`;

// N231 — an optional leading icon (e.g. the running/stopped glyph on the master
// overview) sits before the title, inheriting the muted head color.
const SectionIcon = styled.span`
  display: inline-flex;
  align-items: center;
  color: inherit;
`;

export function Section({
  title,
  count,
  icon,
  titleVariant = "label",
  children,
}: {
  title: string;
  count?: number;
  icon?: ReactNode;
  titleVariant?: SectionTitleVariant;
  children: ReactNode;
}) {
  return (
    <StyledSection>
      <SectionHead $variant={titleVariant}>
        {icon ? <SectionIcon aria-hidden="true">{icon}</SectionIcon> : null}
        {title}
        {typeof count === "number" ? <SectionCount>{count}</SectionCount> : null}
      </SectionHead>
      {children}
    </StyledSection>
  );
}
