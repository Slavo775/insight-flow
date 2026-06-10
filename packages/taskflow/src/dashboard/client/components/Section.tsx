import type { ReactNode } from "react";
import styled from "styled-components";

const StyledSection = styled.div`
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

const SectionHead = styled.h3`
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: ${(p) => p.theme.space.lg};
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
`;

const SectionCount = styled.span`
  background: ${(p) => p.theme.color.border};
  color: ${(p) => p.theme.color.textMuted};
  border-radius: ${(p) => p.theme.radius["2xl"]};
  padding: 1px 7px;
  font-size: ${(p) => p.theme.font.size.xs};
`;

export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <StyledSection>
      <SectionHead>
        {title}
        {typeof count === "number" ? <SectionCount>{count}</SectionCount> : null}
      </SectionHead>
      {children}
    </StyledSection>
  );
}
