import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// N231 — the master overview React island. Source lives in src/master/client and
// builds into dist/master, which the master server serves at / and /overview
// (index.html as the app shell, assets at /assets/*). `base: "/"` keeps asset
// URLs root-absolute on the master origin. Kept as a separate config (not merged
// into vite.config.ts) so `vite build` and `vite build --config
// vite.master.config.ts` produce the two independent bundles.
export default defineConfig({
  root: resolve(here, "src/master/client"),
  base: "/",
  plugins: [react()],
  build: {
    outDir: resolve(here, "dist/master"),
    emptyOutDir: true,
  },
});
