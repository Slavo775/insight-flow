import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// The dashboard SPA (N85). Source lives in src/dashboard/client and builds into
// dist/dashboard, which the node:http server serves on the same port as the API
// (index.html at / and /next, assets at /assets/*). `base: "/"` keeps asset URLs
// root-absolute so they resolve identically whether the page is at / or /next and
// when the dashboard is embedded as an <iframe> in the master overview.
export default defineConfig({
  root: resolve(here, "src/dashboard/client"),
  base: "/",
  plugins: [react()],
  build: {
    outDir: resolve(here, "dist/dashboard"),
    emptyOutDir: true,
  },
  server: {
    port: 6007,
    proxy: {
      "/api": "http://localhost:6006",
      "/events": "http://localhost:6006",
      "/sounds": "http://localhost:6006",
    },
  },
});
