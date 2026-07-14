import styled from "styled-components";

// N231 — a 44×44 bordered square icon button (Lovable `size-11`), shared by the
// header refresh control and the settings-menu trigger so they match exactly.
export const SquareIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: ${(p) => p.theme.radius.xl};
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  color: ${(p) => p.theme.color.text};
  cursor: pointer;
  &:hover {
    border-color: ${(p) => p.theme.color.accent};
  }
`;
