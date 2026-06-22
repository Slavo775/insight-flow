/**
 * N170 — `insight-flow rename` updates a task's title/type/priority through the
 * storage layer (no direct shard edits), leaving the folder/slug stable.
 * Runs the built CLI against a temp project. Requires a prior build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

function project() {
  const dir = mkdtempSync(join(tmpdir(), "n170-rename-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({ workDir: "workTasks", flows: { defaultFlow: "default", byType: {} } }),
  );
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  return dir;
}

const cli = (dir, args) =>
  execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf-8" });

test("rename updates title/type/priority, leaving the folder stable", () => {
  const dir = project();
  const created = JSON.parse(cli(dir, ["create", "--title", "Old", "--type", "fix"]));
  const id = created.id;

  const out = JSON.parse(cli(dir, ["rename", "--id", id, "--title", "New title", "--type", "feat"]));
  assert.equal(out.action, "renamed");
  assert.equal(out.title, "New title");
  assert.equal(out.type, "feat");

  // persisted to the shard, folder untouched
  const shard = JSON.parse(
    readFileSync(join(dir, "insightFlow/workTasks/tasks-N00-N09.json"), "utf-8"),
  );
  const task = shard.tasks.find((t) => t.id === id);
  assert.equal(task.title, "New title");
  assert.equal(task.type, "feat");
  assert.equal(task.folder, created.folder, "folder/slug unchanged");
});

test("rename requires at least one field", () => {
  const dir = project();
  const created = JSON.parse(cli(dir, ["create", "--title", "X"]));
  assert.throws(() => cli(dir, ["rename", "--id", created.id]), /at least one of/);
});
