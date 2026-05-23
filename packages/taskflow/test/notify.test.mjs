/**
 * Smoke tests for `insight-flow notify`.
 * Run: node test/notify.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function makeTmpProject(notificationsCliEnabled = true) {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-notify-test-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: "notify-test",
      rolesDir: ".claude/roles",
      server: { port: 6099 },
      notifications: { browser: true, cli: notificationsCliEnabled },
    }),
  );
  mkdirSync(resolve(dir, "workTasks"), { recursive: true });
  writeFileSync(
    resolve(dir, "workTasks", "master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  return dir;
}

test("notify exits 0 within 500ms with cli enabled", () => {
  const dir = makeTmpProject(true);
  try {
    const start = Date.now();
    execFileSync(process.execPath, [CLI, "notify", "test message"], {
      cwd: dir,
      timeout: 500,
      env: { ...process.env, HOME: dir },
    });
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 500, `Expected exit in <500ms but took ${elapsed}ms`);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("notify exits 0 silently when notifications.cli is false", () => {
  const dir = makeTmpProject(false);
  try {
    const start = Date.now();
    const result = execFileSync(process.execPath, [CLI, "notify", "test message"], {
      cwd: dir,
      timeout: 500,
      env: { ...process.env, HOME: dir },
      encoding: "utf-8",
    });
    const elapsed = Date.now() - start;
    assert.strictEqual(result.trim(), "", "Should produce no output when cli is false");
    assert.ok(elapsed < 500, `Expected fast exit but took ${elapsed}ms`);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
