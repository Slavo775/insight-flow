import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const repoRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: repoRoot,
  base: "./",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: resolve(repoRoot, "packages/taskflow/dist/ui"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(repoRoot, "index.package.html"),
    },
  },
  resolve: {
    alias: {
      "@": resolve(repoRoot, "src"),
    },
  },
});
