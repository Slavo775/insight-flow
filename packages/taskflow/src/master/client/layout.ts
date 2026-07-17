import styled from "styled-components";

// N248 — shared master-UI layout tokens. MAX_WIDTH, the centered `Main`, and the
// subtle panel gradient were copy-pasted across App.tsx, Header.tsx, and
// LogsPage.tsx; defining them once here removes the drift risk.
export const MAX_WIDTH = "1152px";

export const Main = styled.main`
  max-width: ${MAX_WIDTH};
  margin: 0 auto;
  padding: 32px;
`;

// The vertical panel gradient used by the hero card + the logs filter card.
export const PANEL_GRADIENT =
  "linear-gradient(180deg, oklch(0.22 0.03 260) 0%, oklch(0.2 0.02 260) 100%)";
