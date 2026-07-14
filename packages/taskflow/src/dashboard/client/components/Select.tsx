import type { SelectHTMLAttributes } from "react";
import styled from "styled-components";

// N231 — a styled dropdown with a chevron, shared for the master overview's
// editor picker (and reusable for the many raw <select>s across the dashboard).
const Wrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const Chevron = styled.span`
  position: absolute;
  right: ${(p) => p.theme.space.lg};
  display: inline-flex;
  pointer-events: none;
  color: ${(p) => p.theme.color.textMuted};
`;

const Field = styled.select`
  appearance: none;
  height: 44px;
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.md};
  color: ${(p) => p.theme.color.text};
  font-family: ${(p) => p.theme.font.family};
  font-size: ${(p) => p.theme.font.size.md};
  padding: 0 28px 0 ${(p) => p.theme.space.lg};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.color.accent};
  }
`;

function ChevronGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrap>
      <Field {...props} />
      <Chevron>
        <ChevronGlyph />
      </Chevron>
    </Wrap>
  );
}
