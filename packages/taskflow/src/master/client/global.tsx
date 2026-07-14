import { createGlobalStyle } from "styled-components";

// N231 — the master island's base body styling (the dashboard client ships this
// via its own styles.css; the master overview is a separate root). Colors/fonts
// come from the shared theme tokens so the monospace dark look is preserved.
export const MasterGlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${(p) => p.theme.font.family};
    background: ${(p) => p.theme.color.bg};
    color: ${(p) => p.theme.color.text};
    -webkit-font-smoothing: antialiased;
  }
  ul { list-style: none; margin: 0; padding: 0; }
`;
