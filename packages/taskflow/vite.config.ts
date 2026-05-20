import { existsSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageRoot, "..", "..");
const outDir = resolve(packageRoot, "dist", "ui");

export default defineConfig({
  root: repoRoot,
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    {
      name: "taskflow-rename-package-html",
      closeBundle() {
        const from = resolve(outDir, "index.package.html");
        const to = resolve(outDir, "index.html");
        if (existsSync(from)) {
          renameSync(from, to);
        }
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(repoRoot, "index.package.html"),
      output: {
        manualChunks: {
          recharts: ["recharts"],
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
        },
      },
    },
  },
});
