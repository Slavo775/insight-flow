import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// N238 — build the shared hub notification client (src/master/client/hub-notify.ts)
// into a single self-contained IIFE at dist/master/hub-notify.js, served by the
// master server at /hub-notify.js and injected into every hub page. Lib mode
// gives a fixed filename (no hash) so the injected <script src> stays stable.
// `emptyOutDir: false` so this runs AFTER vite.master.config.ts (the React app)
// without wiping it.
export default defineConfig({
  build: {
    outDir: resolve(here, "dist/master"),
    emptyOutDir: false,
    lib: {
      entry: resolve(here, "src/master/client/hub-notify.ts"),
      formats: ["iife"],
      name: "HubNotify",
      fileName: () => "hub-notify.js",
    },
  },
});
