/**
 * Smoke tests for `insight-flow log-event`.
 * Run: node test/log-event.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function makeTmpProject(extraConfig = {}) {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-log-event-test-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: "log-event-test",
      rolesDir: ".claude/roles",
      server: { port: 6098 },
      activityEngine: { enabled: true, logFile: ".taskflow-activity.jsonl", maxEvents: 200 },
      ...extraConfig,
    }),
  );
  mkdirSync(resolve(dir, "workTasks"), { recursive: true });
  // Create minimal master.json with no current task
  writeFileSync(
    resolve(dir, "workTasks", "master.json"),
    JSON.stringify({ meta: { nextId: 1, currentTaskId: null, nextIncidentId: 1, shards: [] } }, null, 2),
  );
  return dir;
}

function makeTaskFolder(dir, taskId) {
  const slug = `${taskId}-test-task`;
  const folder = resolve(dir, "workTasks", slug);
  mkdirSync(folder, { recursive: true });
  return folder;
}

test("log-event happy path — writes events.json and prints JSON to stdout", () => {
  const dir = makeTmpProject();
  const folder = makeTaskFolder(dir, "N01");
  try {
    const result = execFileSync(
      process.execPath,
      [CLI, "log-event", "start", "--task", "N01"],
      { cwd: dir, timeout: 500, encoding: "utf-8" },
    );
    const out = JSON.parse(result.trim());
    assert.strictEqual(out.event, "start");
    assert.strictEqual(out.taskId, "N01");
    assert.ok(out.ts, "should have timestamp");

    const eventsPath = resolve(folder, "events.json");
    assert.ok(existsSync(eventsPath), "events.json should exist");
    const stored = JSON.parse(readFileSync(eventsPath, "utf-8"));
    assert.strictEqual(stored.taskId, "N01");
    assert.strictEqual(stored.events.length, 1);
    assert.strictEqual(stored.events[0].type, "start");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("log-event invalid type exits 1 with usage", () => {
  const dir = makeTmpProject();
  try {
    const result = spawnSync(process.execPath, [CLI, "log-event", "foobar"], {
      cwd: dir,
      timeout: 500,
      encoding: "utf-8",
    });
    assert.strictEqual(result.status, 1, "should exit 1");
    assert.ok(result.stderr.includes("unknown event type"), "should mention unknown type");
    assert.ok(result.stderr.includes("mandatory:"), "should list mandatory types");
    assert.ok(result.stderr.includes("optional:"), "should list optional types");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("log-event dedup — second call within window is silently dropped", () => {
  const dir = makeTmpProject({ events: { dedupWindowSeconds: 60 } });
  const folder = makeTaskFolder(dir, "N02");
  try {
    execFileSync(process.execPath, [CLI, "log-event", "done", "--task", "N02"], {
      cwd: dir, timeout: 500,
    });
    // Second call immediately — should be deduped
    const result = spawnSync(
      process.execPath,
      [CLI, "log-event", "done", "--task", "N02"],
      { cwd: dir, timeout: 500, encoding: "utf-8" },
    );
    assert.strictEqual(result.status, 0, "should exit 0 silently");
    assert.strictEqual(result.stdout.trim(), "", "should produce no output on dedup");

    const eventsPath = resolve(folder, "events.json");
    const stored = JSON.parse(readFileSync(eventsPath, "utf-8"));
    assert.strictEqual(stored.events.length, 1, "events.json must contain exactly one entry");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("log-event dedup disabled — both calls write", () => {
  const dir = makeTmpProject({ events: { dedupWindowSeconds: 0 } });
  const folder = makeTaskFolder(dir, "N03");
  try {
    execFileSync(process.execPath, [CLI, "log-event", "start", "--task", "N03"], {
      cwd: dir, timeout: 500,
    });
    execFileSync(process.execPath, [CLI, "log-event", "start", "--task", "N03"], {
      cwd: dir, timeout: 500,
    });
    const eventsPath = resolve(folder, "events.json");
    const stored = JSON.parse(readFileSync(eventsPath, "utf-8"));
    assert.strictEqual(stored.events.length, 2, "both writes should be stored when dedup is off");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("log-event appends to activity log with tool=Event", () => {
  const dir = makeTmpProject();
  makeTaskFolder(dir, "N04");
  try {
    execFileSync(process.execPath, [CLI, "log-event", "edit-start", "--task", "N04"], {
      cwd: dir, timeout: 500,
    });
    const logPath = resolve(dir, ".taskflow-activity.jsonl");
    assert.ok(existsSync(logPath), "activity log should exist");
    const ev = JSON.parse(readFileSync(logPath, "utf-8").trim());
    assert.strictEqual(ev.tool, "Event");
    assert.strictEqual(ev.action, "edit-start");
    assert.strictEqual(ev.taskId, "N04");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("log-event exits within 100ms", () => {
  const dir = makeTmpProject();
  makeTaskFolder(dir, "N05");
  try {
    const start = Date.now();
    execFileSync(process.execPath, [CLI, "log-event", "done", "--task", "N05"], {
      cwd: dir, timeout: 500,
    });
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `Expected <100ms but took ${elapsed}ms`);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
