import { createGlobalStyle } from "styled-components";

// N86: the `:root` CSS custom properties are now emitted from the theme tokens,
// so the token object is the single source of truth even for the parts that must
// stay CSS classes (the activity-feed HTML injected via dangerouslySetInnerHTML,
// markdown-body, layout). styles.css keeps only layout/structural rules, which
// consume these vars.
export const GlobalStyle = createGlobalStyle`
  :root {
    --bg: ${(p) => p.theme.color.bg};
    --surface: ${(p) => p.theme.color.surface};
    --border: ${(p) => p.theme.color.border};
    --text: ${(p) => p.theme.color.text};
    --text-muted: ${(p) => p.theme.color.textMuted};
    --accent: ${(p) => p.theme.color.accent};
    --green: ${(p) => p.theme.color.green};
    --yellow: ${(p) => p.theme.color.yellow};
    --red: ${(p) => p.theme.color.red};
    --purple: ${(p) => p.theme.color.purple};
    --orange: ${(p) => p.theme.color.orange};
    --cyan: ${(p) => p.theme.color.cyan};
  }
`;
