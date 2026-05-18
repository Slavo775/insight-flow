#!/usr/bin/env node
/**
 * Build the React SPA into packages/taskflow/dist/ui.
 *
 * Invoked from packages/taskflow's `build:ui` script. Resolves the repo root
 * by walking up from this script's location, then runs Vite with the
 * package-specific config. Output goes to packages/taskflow/dist/ui.
 *
 * Vite writes the entry HTML using its input filename (`index.package.html`).
 * We rename it to `index.html` so the taskflow server can serve a stable path.
 */
import { spawnSync } from "node:child_process";
import { renameSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const viteBin = resolve(repoRoot, "node_modules", ".bin", "vite");

const result = spawnSync(viteBin, ["build", "--config", "vite.package.config.ts"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const uiDir = resolve(repoRoot, "packages/taskflow/dist/ui");
const rawHtml = resolve(uiDir, "index.package.html");
const finalHtml = resolve(uiDir, "index.html");

if (existsSync(rawHtml)) {
  renameSync(rawHtml, finalHtml);
  console.log("Renamed dist/ui/index.package.html → index.html");
}

process.exit(0);
