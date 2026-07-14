import type { ReactNode } from "react";
import styled from "styled-components";
import { StatusPill, statusToneColors, type StatusTone } from "./StatusPill.js";

// N231 — a project/server row for the master overview, matching the Lovable
// prototype: a full-width horizontal row with a colored left accent, a status
// pill on the left, the name + current task in the middle, and a notifications
// bell toggle + an action (Open / Start) on the right. Shared + composed from
// StatusPill; the tone drives the left accent + row tint via statusToneColors.

const Row = styled.li<{ $accent: string; $bg: string }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.lg};
  border: 1px solid ${(p) => p.theme.color.border};
  border-left: 4px solid ${(p) => p.$accent};
  border-radius: ${(p) => p.theme.radius.xl};
  background: ${(p) => p.$bg};
  padding: ${(p) => p.theme.space["2xl"]};

  @media (min-width: 720px) {
    flex-direction: row;
    align-items: center;
    gap: ${(p) => p.theme.space.xl};
  }
`;

const Middle = styled.div`
  min-width: 0;
  flex: 1;
`;

const Name = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: ${(p) => p.theme.color.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Task = styled.p`
  margin: 2px 0 0;
  font-size: 14px;
  line-height: 20px;
  color: ${(p) => p.theme.color.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  flex-shrink: 0;
`;

const BellBtn = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: ${(p) => p.theme.radius.xl};
  cursor: pointer;
  background: ${(p) => (p.$on ? "oklch(0.3 0.06 240)" : "oklch(0.24 0.02 260)")};
  border: 1px solid ${(p) => (p.$on ? "oklch(0.6 0.14 240)" : "oklch(0.38 0.02 260)")};
  color: ${(p) => (p.$on ? "oklch(0.95 0.14 240)" : "oklch(0.85 0.02 260)")};
  &:hover {
    border-color: ${(p) => (p.$on ? "oklch(0.7 0.14 240)" : "oklch(0.5 0.02 260)")};
  }
`;

function BellGlyph({ muted }: { muted: boolean }) {
  return muted ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
      <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <path d="m2 2 20 20" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export interface ProjectCardPill {
  tone: StatusTone;
  label: string;
  icon: ReactNode;
}

export function ProjectCard({
  label,
  pill,
  taskText,
  muted,
  onToggleMute,
  action,
}: {
  label: string;
  pill: ProjectCardPill;
  taskText: string;
  muted: boolean;
  onToggleMute: () => void;
  /** The Open link (online) or Start button (offline). */
  action: ReactNode;
}) {
  const colors = statusToneColors(pill.tone);
  return (
    <Row $accent={colors.border} $bg={colors.rowBg}>
      <StatusPill tone={pill.tone} icon={pill.icon}>
        {pill.label}
      </StatusPill>
      <Middle>
        <Name title={label}>{label}</Name>
        <Task title={taskText}>{taskText}</Task>
      </Middle>
      <Actions>
        <BellBtn
          type="button"
          $on={!muted}
          aria-pressed={muted}
          aria-label={
            muted ? `Muted — enable notifications for ${label}` : `Mute notifications for ${label}`
          }
          title={muted ? "Notifications muted" : "Mute notifications"}
          onClick={onToggleMute}
        >
          <BellGlyph muted={muted} />
        </BellBtn>
        {action}
      </Actions>
    </Row>
  );
}
