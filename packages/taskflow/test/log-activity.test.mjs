/**
 * Smoke tests for `insight-flow log-activity`.
 * Run: node test/log-activity.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const LOG_FILE = ".taskflow-activity.jsonl";

function makeTmpProject(activityConfig = {}) {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-log-activity-test-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: "log-activity-test",
      rolesDir: ".claude/roles",
      server: { port: 6099 },
      activityEngine: {
        enabled: true,
        logFile: LOG_FILE,
        maxEvents: 200,
        phaseMarkers: true,
        ...activityConfig,
      },
    }),
  );
  mkdirSync(resolve(dir, "workTasks"), { recursive: true });
  return dir;
}

test("log-activity appends a Phase JSONL line", () => {
  const dir = makeTmpProject();
  try {
    execFileSync(process.execPath, [CLI, "log-activity", "test message", "--phase", "start"], {
      cwd: dir,
      timeout: 500,
    });
    const logPath = resolve(dir, LOG_FILE);
    assert.ok(existsSync(logPath), "log file should exist");
    const lines = readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean);
    assert.strictEqual(lines.length, 1, "should write exactly one line");
    const ev = JSON.parse(lines[0]);
    assert.strictEqual(ev.tool, "Phase");
    assert.strictEqual(ev.action, "start");
    assert.strictEqual(ev.message, "test message");
    assert.ok(ev.ts, "should have a timestamp");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("log-activity --phase done writes action=done", () => {
  const dir = makeTmpProject();
  try {
    execFileSync(process.execPath, [CLI, "log-activity", "completed N99", "--phase", "done"], {
      cwd: dir,
      timeout: 500,
    });
    const logPath = resolve(dir, LOG_FILE);
    assert.ok(existsSync(logPath));
    const ev = JSON.parse(readFileSync(logPath, "utf-8").trim());
    assert.strictEqual(ev.tool, "Phase");
    assert.strictEqual(ev.action, "done");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("log-activity is silent and writes nothing when phaseMarkers: false", () => {
  const dir = makeTmpProject({ phaseMarkers: false });
  try {
    const result = execFileSync(
      process.execPath,
      [CLI, "log-activity", "should be ignored"],
      { cwd: dir, timeout: 500, encoding: "utf-8" },
    );
    assert.strictEqual(result.trim(), "", "should produce no output");
    assert.ok(!existsSync(resolve(dir, LOG_FILE)), "log file should not be created");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("log-activity exits within 100ms", () => {
  const dir = makeTmpProject();
  try {
    const start = Date.now();
    execFileSync(process.execPath, [CLI, "log-activity", "speed test", "--phase", "edit-start"], {
      cwd: dir,
      timeout: 500,
    });
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `Expected <100ms but took ${elapsed}ms`);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
