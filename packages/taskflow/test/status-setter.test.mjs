/**
 * N131 — the flow-validated status setter. Pure setter: default-flow accepts
 * every canonical status (byte-identical), a custom flow gates to its own set.
 * End-to-end: the shipped lifecycle commands route through it — a default-flow
 * task runs the lifecycle unchanged; a custom-flow task whose set excludes the
 * canonical target is rejected with a clean error.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  setStatus,
  flowStatusUniverse,
  InvalidStatusTransitionError,
  DEFAULT_PROJECT,
  TASK_STATUSES,
} from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

function task() {
  return { id: "N00", status: "ready", statusHistory: [], flowId: "default" };
}

// ---- pure setter ------------------------------------------------------------

test("N131: flowStatusUniverse — declared set, else canonical fallback", () => {
  assert.deepEqual(flowStatusUniverse(undefined), [...TASK_STATUSES]);
  assert.deepEqual(flowStatusUniverse({ statuses: [] }), [...TASK_STATUSES]);
  assert.deepEqual(flowStatusUniverse({ statuses: [{ id: "a" }, { id: "b" }] }), ["a", "b"]);
});

test("N131: default flow accepts every canonical status (byte-identical writes)", () => {
  for (const s of TASK_STATUSES) {
    const t = task();
    setStatus(t, s, { by: "tester", at: "2026-06-16T00:00:00.000Z" }, DEFAULT_PROJECT);
    assert.equal(t.status, s);
    assert.deepEqual(t.statusHistory.at(-1), {
      status: s,
      at: "2026-06-16T00:00:00.000Z",
      by: "tester",
    });
  }
});

test("N131: a custom flow gates to its own status set", () => {
  const qa = { statuses: [{ id: "queued" }, { id: "verifying" }, { id: "shipped" }] };

  const ok = task();
  ok.flowId = "custom:qa";
  setStatus(ok, "verifying", { by: "qa", at: "t" }, qa);
  assert.equal(ok.status, "verifying");

  // a canonical status NOT in the flow's set is rejected; task untouched
  const bad = task();
  bad.flowId = "custom:qa";
  assert.throws(
    () => setStatus(bad, "in-progress", { by: "qa", at: "t" }, qa),
    (err) =>
      err instanceof InvalidStatusTransitionError &&
      /not a status of flow 'custom:qa'/.test(err.message),
  );
  assert.equal(bad.status, "ready");
  assert.equal(bad.statusHistory.length, 0);
});

test("N131: an unknown/undefined flow falls back to the canonical universe", () => {
  const t = task();
  setStatus(t, "implemented", { by: "x", at: "t" }, undefined);
  assert.equal(t.status, "implemented");
});

// ---- end-to-end through the shipped commands --------------------------------

function project(customFlow) {
  const dir = mkdtempSync(join(tmpdir(), "n131-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({ workDir: "workTasks", flows: { defaultFlow: "default", byType: {} } }),
  );
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  if (customFlow) {
    mkdirSync(join(dir, "insightFlow/projects"), { recursive: true });
    writeFileSync(
      join(dir, "insightFlow/projects", `${customFlow.id.replace(/^custom:/, "")}.json`),
      JSON.stringify(customFlow),
    );
  }
  return dir;
}

function cli(dir, args) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf-8" });
}

const shardOf = (dir) =>
  JSON.parse(readFileSync(join(dir, "insightFlow/workTasks/tasks-N00-N09.json"), "utf-8")).tasks[0];

test("N131 e2e: default-flow lifecycle runs unchanged through the setter", () => {
  const dir = project();
  const id = JSON.parse(cli(dir, ["create", "--title", "T", "--type", "feat"])).id;
  cli(dir, ["implement-start", "--id", id]);
  assert.equal(shardOf(dir).status, "in-progress");
  cli(dir, ["implement-end", "--id", id]);
  assert.equal(shardOf(dir).status, "implemented");
  cli(dir, ["push", "--id", id, "--commit", "abc123", "--message", "feat: x"]);
  assert.equal(shardOf(dir).status, "pushed");
  cli(dir, ["merge", "--id", id]);
  assert.equal(shardOf(dir).status, "merged");
  // history recorded each transition in order
  assert.deepEqual(
    shardOf(dir).statusHistory.map((h) => h.status),
    ["ready", "in-progress", "implemented", "pushed", "merged"],
  );
});

test("N131 e2e: a custom-flow task rejects an out-of-set canonical transition", () => {
  const qa = {
    id: "custom:qa",
    title: "QA",
    agents: ["task-implement", "task-git"],
    flow: [],
    install: [],
    statuses: [
      { id: "ready", title: "ready" },
      { id: "queued", title: "Queued" },
      { id: "shipped", title: "Shipped", terminal: true },
    ],
  };
  const dir = project(qa);
  const id = JSON.parse(
    cli(dir, ["create", "--title", "T", "--type", "feat", "--flow", "custom:qa"]),
  ).id;
  assert.equal(shardOf(dir).flowId, "custom:qa");

  // implement-start sets "in-progress", which custom:qa does not declare → reject
  assert.throws(
    () => cli(dir, ["implement-start", "--id", id]),
    (err) => /not a status of flow 'custom:qa'/.test(String(err.stderr)),
  );
  // task stays ready — the write was gated before mutation
  assert.equal(shardOf(dir).status, "ready");
});
