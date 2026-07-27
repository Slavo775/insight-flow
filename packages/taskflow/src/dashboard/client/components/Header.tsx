import type { ReactNode } from "react";
import styled from "styled-components";

// N248 — the shared UI header, extracted from App.tsx so the overview and the
// /logs page use one sticky blur bar. Full-width bar with a bottom border
// (Lovable): 44px controls + 16px top/bottom padding, 32px left/right, inner
// content centered at `maxWidth`.
// N258 — promoted into the shared component barrel so the project dashboard header
// reuses the same bar. Added an optional `center` slot (a middle strip, e.g. the
// dashboard's scrollable nav) and a `maxWidth` prop; `className` is forwarded to
// the bar so a consumer can restyle it with `styled(Header)`.

// Mirrors master's layout.ts MAX_WIDTH (1152px); kept as the prop default so this
// component carries no dependency back into master/client.
const DEFAULT_MAX_WIDTH = "1152px";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid ${(p) => p.theme.color.border};
  background: oklch(0.19 0.02 260 / 0.9);
  backdrop-filter: blur(8px);
`;

// N258 — with a center slot the bar stays on ONE line (nowrap): the center (menu)
// shrinks and scrolls instead of wrapping the actions to a second row. Without a
// center (master overview / logs), the actions still wrap on narrow, as before.
const Inner = styled.div<{ $maxWidth: string; $hasCenter?: boolean }>`
  max-width: ${(p) => p.$maxWidth};
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => p.theme.space["2xl"]};
  padding: 16px 32px;
  flex-wrap: ${(p) => (p.$hasCenter ? "nowrap" : "wrap")};
`;

// N258 — Left/Actions keep their size (flex-shrink:0); only the center menu shrinks.
const Left = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.lg};
  flex-shrink: 0;
`;

// The middle slot hugs its content (flex:0 1 auto) so the wrapper stays tight around
// the menu and — with the Inner's space-between — sits centered between Left and
// Actions. min-width:0 lets the inner scroll container (the dashboard nav) shrink and
// scroll on narrow widths instead of forcing the bar wider or wrapping.
const Center = styled.div`
  flex: 0 1 auto;
  min-width: 0;
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
  flex-shrink: 0;
`;

export function Header({
  icon,
  before,
  eyebrow,
  title,
  center,
  children,
  maxWidth = DEFAULT_MAX_WIDTH,
  className,
}: {
  /** Brand icon shown in the green box (e.g. the overview's server icon). */
  icon?: ReactNode;
  /** Element rendered left of the brand — e.g. the /logs "Projects" back button. */
  before?: ReactNode;
  eyebrow: string;
  title: string;
  /** Middle strip between the brand and the actions (e.g. a scrollable nav). */
  center?: ReactNode;
  /** Right-side actions (search, buttons, menus). */
  children?: ReactNode;
  /** Inner content max-width. Defaults to 1152px (the master overview width). */
  maxWidth?: string;
  /** Forwarded to the sticky bar so consumers can restyle it with styled(Header). */
  className?: string;
}) {
  return (
    <Bar className={className}>
      <Inner $maxWidth={maxWidth} $hasCenter={!!center}>
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
        {center ? <Center>{center}</Center> : null}
        {children ? <Actions>{children}</Actions> : null}
      </Inner>
    </Bar>
  );
}
