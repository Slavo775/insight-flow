import styled, { css } from "styled-components";

export type TextVariant = "h1" | "h2" | "subtitle";

const textVariants = {
  h1: css`
    font-size: ${(p) => p.theme.font.size["2xl"]};
    font-weight: ${(p) => p.theme.font.weight.bold};
    margin-bottom: ${(p) => p.theme.space.xs};
  `,
  h2: css`
    font-size: ${(p) => p.theme.font.size.xl};
    font-weight: ${(p) => p.theme.font.weight.bold};
    margin-bottom: ${(p) => p.theme.space["2xl"]};
  `,
  subtitle: css`
    font-size: ${(p) => p.theme.font.size.base};
    color: ${(p) => p.theme.color.textMuted};
    margin-bottom: 0;
  `,
};

/** Typographic primitive. Use `as` to pick the element (h1/h2/p). */
export const Text = styled.span<{ $variant: TextVariant }>`
  ${(p) => textVariants[p.$variant]}
`;
