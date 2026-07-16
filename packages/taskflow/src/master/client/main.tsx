import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { App } from "./App.js";
import { LogsPage } from "./LogsPage.js";
import { MasterGlobalStyle } from "./global.js";
import { GlobalStyle } from "../../dashboard/client/GlobalStyle.js";
import { theme } from "../../dashboard/client/theme.js";
import { ErrorBoundary } from "../../dashboard/client/ErrorBoundary.js";

// N244 — minimal path routing (the master client has no router). The master
// server serves this same shell at `/` and `/logs`; pick the view from the path.
const onLogsPage = window.location.pathname.replace(/\/+$/, "").endsWith("/logs");

// N243 — the master overview is same-origin with the master, so it posts render
// errors straight to /log with the reserved "master" key.
function reportError(log: { type: "error"; message: string; data?: unknown }): void {
  void fetch("/log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "master", log }),
  }).catch(() => {});
}

// N231 — the master overview React island. Reuses the dashboard client's design
// tokens (theme) + :root var emitter (GlobalStyle), plus a small body reset
// (MasterGlobalStyle). Served by the master server at / and /overview.
//
// The Lovable prototype uses a sans-serif system font (Tailwind default), not the
// dashboard's monospace, and a blue-tinted dark palette (hue 260), not the
// dashboard's neutral black. Override both here — a master-only theme, so every
// themed component in the island picks up the Lovable look while the dense
// dashboard (its own ThemeProvider) keeps monospace + neutral black.
const SANS =
  'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
const masterTheme = {
  ...theme,
  color: {
    ...theme.color,
    bg: "oklch(0.17 0.02 260)",
    surface: "oklch(0.22 0.02 260)",
    border: "oklch(0.34 0.02 260)",
    text: "oklch(0.97 0.01 260)",
    textMuted: "oklch(0.78 0.02 260)",
  },
  font: { ...theme.font, family: SANS },
};

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ThemeProvider theme={masterTheme}>
        <GlobalStyle />
        <MasterGlobalStyle />
        <ErrorBoundary report={reportError}>{onLogsPage ? <LogsPage /> : <App />}</ErrorBoundary>
      </ThemeProvider>
    </StrictMode>,
  );
}
