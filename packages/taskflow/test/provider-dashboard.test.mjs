/**
 * N76 — dashboard renders the unified "Agent Activity" feed + provider badge.
 * Run: node test/provider-dashboard.test.mjs   (build must run first)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const { getDashboardHtml } = await import(fileURLToPath(new URL("../dist/index.js", import.meta.url)));

const CONFIG = {
  workDir: "workTasks",
  shardSize: 10,
  projectName: "provider-test",
  rolesDir: ".claude/roles",
  server: { port: 6006 },
  activityEngine: { enabled: true, logFile: ".taskflow-activity.jsonl", maxEvents: 200 },
};

test("dashboard pane is relabeled to 'Agent Activity' (not Claude-specific)", () => {
  const html = getDashboardHtml(CONFIG);
  assert.match(html, /Agent Activity/, "pane should be relabeled");
  assert.ok(!html.includes("Claude Activity"), "old 'Claude Activity' label should be gone");
});

test("dashboard ships the providerBadge helper + claude/cursor badge CSS", () => {
  const html = getDashboardHtml(CONFIG);
  assert.match(html, /function providerBadge/, "providerBadge helper present");
  assert.match(html, /activity-badge-provider-claude/, "claude badge class present");
  assert.match(html, /activity-badge-provider-cursor/, "cursor badge class present");
});

test("firePermissionAlert is always defined when notifications.browser is false (N79)", () => {
  const html = getDashboardHtml({
    ...CONFIG,
    notifications: { browser: false, cli: true },
  });
  assert.match(html, /function firePermissionAlert/, "status handler must not ReferenceError");
  assert.ok(
    !html.includes("function fireStatusDesktopNotif"),
    "browser toast helper omitted when browser notifications disabled",
  );
  assert.match(
    html,
    /typeof fireStatusDesktopNotif === 'function'/,
    "permission alert guards optional browser toast",
  );
});
