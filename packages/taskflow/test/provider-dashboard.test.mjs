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

test("SPA ships the provider badge classes (cursor + other)", () => {
  // ProviderBadge (ActivityItem.tsx) renders only for non-claude providers:
  // "cursor" → .activity-badge-provider-cursor, anything else → -other. The claude
  // badge is intentionally never rendered (returns null), so its dead CSS class was
  // dropped in the N262 activity-pane redesign — assert the two that actually ship.
  assert.match(CSS, /activity-badge-provider-cursor/, "cursor provider badge class present");
  assert.match(CSS, /activity-badge-provider-other/, "other provider badge class present");
});

test("N238: the project SPA no longer ships notifications/sounds (hub owns them)", () => {
  // Sound + browser-notification firing moved wholly to the hub (/hub-notify.js).
  assert.ok(
    !JS.includes("permission-alert.mp3") && !JS.includes("idle-ping.mp3"),
    "project SPA must not wire notification sounds anymore",
  );
  // The visual page-title glyphs stay in the project SPA.
  assert.match(JS, /Taskflow Dashboard/, "page-title base string still present");
});
