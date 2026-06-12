import styled, { css } from "styled-components";

export type ButtonVariant = "nav" | "tab" | "icon" | "close" | "docTab" | "primary" | "danger";

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
  // N106 — form actions (module/agent/project authoring).
  primary: css`
    background: ${(p) => p.theme.color.accent};
    border: 1px solid ${(p) => p.theme.color.accent};
    color: #fff;
    padding: 6px 16px;
    border-radius: ${(p) => p.theme.radius.md};
    font-size: ${(p) => p.theme.font.size.md};
    &:hover {
      opacity: 0.9;
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
  danger: css`
    background: none;
    border: 1px solid ${(p) => p.theme.color.red};
    color: ${(p) => p.theme.color.red};
    padding: 6px 16px;
    border-radius: ${(p) => p.theme.radius.md};
    font-size: ${(p) => p.theme.font.size.md};
    &:hover {
      background: ${(p) => p.theme.color.red};
      color: #fff;
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
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
