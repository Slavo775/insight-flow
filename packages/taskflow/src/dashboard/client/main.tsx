import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { App } from "./App.js";
import { GlobalStyle } from "./GlobalStyle.js";
import { theme } from "./theme.js";
import { BASE, apiUrl } from "./base.js";
import { ErrorBoundary } from "./ErrorBoundary.js";
import "./styles.css";

// N243 — the project dashboard posts render errors to its OWN server's /log,
// which forwards to the master keyed by the project's token (the browser never
// holds the master key). apiUrl handles the hub-proxy base prefix.
function reportError(log: { type: "error"; message: string; data?: unknown }): void {
  void fetch(apiUrl("/log"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ log }),
  }).catch(() => {});
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <ErrorBoundary report={reportError}>
          {/* N218 — basename so the router matches under the hub proxy (/p/<id>/); BASE is "" standalone. */}
          <BrowserRouter basename={BASE || "/"}>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </StrictMode>,
  );
}
