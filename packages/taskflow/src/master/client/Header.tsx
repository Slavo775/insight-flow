import type { ReactNode } from "react";
import styled from "styled-components";
import { MAX_WIDTH } from "./layout.js";

// N248 — the shared master-UI header, extracted from App.tsx so the overview and
// the /logs page use one sticky blur bar. Full-width bar with a bottom border
// (Lovable): 44px controls + 16px top/bottom padding, 32px left/right, inner
// content centered at MAX_WIDTH.

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid ${(p) => p.theme.color.border};
  background: oklch(0.19 0.02 260 / 0.9);
  backdrop-filter: blur(8px);
`;

const Inner = styled.div`
  max-width: ${MAX_WIDTH};
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => p.theme.space["2xl"]};
  padding: 16px 32px;
  flex-wrap: wrap;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.lg};
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.lg};
`;

const BrandIcon = styled.span`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: ${(p) => p.theme.radius.lg};
  background: #12351f;
  color: ${(p) => p.theme.color.green};
`;

// N248 — Lovable eyebrow is text-xs (12px); the theme `xs` token is 10px, so use
// `base` (12px) to match. tracking-widest, muted, normal weight.
const Eyebrow = styled.p`
  font-size: ${(p) => p.theme.font.size.base};
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: ${(p) => p.theme.color.textMuted};
  margin: 0;
`;

const Title = styled.h1`
  font-size: ${(p) => p.theme.font.size["2xl"]};
  font-weight: ${(p) => p.theme.font.weight.semibold};
  margin: 0;
  line-height: 1.25;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  flex-wrap: wrap;
`;

export function Header({
  icon,
  before,
  eyebrow,
  title,
  children,
}: {
  /** Brand icon shown in the green box (e.g. the overview's server icon). */
  icon?: ReactNode;
  /** Element rendered left of the brand — e.g. the /logs "Projects" back button. */
  before?: ReactNode;
  eyebrow: string;
  title: string;
  /** Right-side actions (search, buttons, menus). */
  children?: ReactNode;
}) {
  return (
    <Bar>
      <Inner>
        <Left>
          {before}
          <Brand>
            {icon ? <BrandIcon aria-hidden="true">{icon}</BrandIcon> : null}
            <div>
              <Eyebrow>{eyebrow}</Eyebrow>
              <Title>{title}</Title>
            </div>
          </Brand>
        </Left>
        {children ? <Actions>{children}</Actions> : null}
      </Inner>
    </Bar>
  );
}
