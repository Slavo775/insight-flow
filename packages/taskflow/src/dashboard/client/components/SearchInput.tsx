import type { InputHTMLAttributes } from "react";
import styled from "styled-components";

// N231 — a text input with a leading search icon, shared for the master overview
// header (and reusable for the many raw "Search …" inputs across the dashboard).
const Wrap = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
`;

const Glyph = styled.span`
  position: absolute;
  left: ${(p) => p.theme.space.lg};
  display: inline-flex;
  pointer-events: none;
  color: ${(p) => p.theme.color.textMuted};
`;

const Field = styled.input`
  width: 100%;
  height: 44px;
  box-sizing: border-box;
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.md};
  color: ${(p) => p.theme.color.text};
  font-family: ${(p) => p.theme.font.family};
  font-size: ${(p) => p.theme.font.size.md};
  padding: 0 ${(p) => p.theme.space.lg} 0 32px;

  &::placeholder {
    color: ${(p) => p.theme.color.textMuted};
  }
  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.color.accent};
  }
`;

function SearchGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// `aria-label` (or a wrapping label) should be supplied by the caller since the
// visible label is only the icon.
export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrap>
      <Glyph>
        <SearchGlyph />
      </Glyph>
      <Field type="search" {...props} />
    </Wrap>
  );
}
