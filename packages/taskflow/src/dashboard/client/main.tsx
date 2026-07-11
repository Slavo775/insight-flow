import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { App } from "./App.js";
import { GlobalStyle } from "./GlobalStyle.js";
import { theme } from "./theme.js";
import { BASE } from "./base.js";
import "./styles.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        {/* N218 — basename so the router matches under the hub proxy (/p/<id>/); BASE is "" standalone. */}
        <BrowserRouter basename={BASE || "/"}>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  );
}
