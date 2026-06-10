/**
 * N76 feature (provider badge + "Agent Activity" feed), re-pinned for the N85
 * React rewrite. The dashboard is no longer server-rendered HTML — these features
 * now live in the Vite-built SPA (dist/dashboard). We assert against the built
 * bundle: string literals and CSS class names survive minification, so they are
 * stable anchors. Requires a prior build (dist/ present).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS_DIR = fileURLToPath(new URL("../dist/dashboard/assets", import.meta.url));

function readAssets(ext) {
  return readdirSync(ASSETS_DIR)
    .filter((f) => f.endsWith(ext))
    .map((f) => readFileSync(resolve(ASSETS_DIR, f), "utf-8"))
    .join("\n");
}

const JS = readAssets(".js");
const CSS = readAssets(".css");

test("SPA bundle ships the unified 'Agent Activity' feed label (not Claude-specific)", () => {
  assert.match(JS, /Agent Activity/, "'Agent Activity' label present in the SPA bundle");
  assert.ok(!JS.includes("Claude Activity"), "old 'Claude Activity' label should be gone");
});

test("SPA ships the provider badge classes (claude + cursor)", () => {
  assert.match(CSS, /activity-badge-provider-claude/, "claude provider badge class present");
  assert.match(CSS, /activity-badge-provider-cursor/, "cursor provider badge class present");
});

test("SPA ships the notification/sound layer (permission-alert sound + status glyphs)", () => {
  assert.match(JS, /permission-alert\.mp3/, "permission-alert sound wired in the SPA");
  assert.match(JS, /Taskflow Dashboard/, "page-title base string present");
});
