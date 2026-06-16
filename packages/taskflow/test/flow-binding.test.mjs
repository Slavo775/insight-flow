/**
 * N116 — flow binding: Task.flowId default, flows config merge, and the
 * create-time resolution (--flow → byType → defaultFlow → "default" fallback).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TaskSchema, resolveConfig } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

const BASE_TASK = {
  id: "N00",
  title: "T",
  type: "feat",
  priority: "low",
  status: "ready",
  folder: "insightFlow/workTasks/N00-t",
  createdAt: "2026-06-15T00:00:00.000Z",
  statusHistory: [],
  implementation: { startedAt: null, completedAt: null, filesChanged: [], tokensUsed: null },
  changesAfterImplementation: [],
  committedAt: null,
  totalDurationMinutes: null,
  tags: [],
};

test("Task.flowId defaults to 'default' and preserves an explicit value", () => {
  assert.equal(TaskSchema.parse({ ...BASE_TASK }).flowId, "default");
  assert.equal(TaskSchema.parse({ ...BASE_TASK, flowId: "custom:hotfix" }).flowId, "custom:hotfix");
});

test("flows config merges: user byType extends, defaultFlow preserved", () => {
  const dir = mkdtempSync(join(tmpdir(), "n116-cfg-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({ workDir: "workTasks", flows: { byType: { fix: "custom:hotfix" } } }),
  );
  mkdirSync(join(dir, "workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  const cfg = resolveConfig(dir);
  assert.equal(cfg.flows.defaultFlow, "default"); // preserved despite user only setting byType
  assert.equal(cfg.flows.byType.fix, "custom:hotfix");
});

function project({ byType = {}, customFlow } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "n116-create-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({ workDir: "workTasks", flows: { defaultFlow: "default", byType } }),
  );
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  if (customFlow) {
    mkdirSync(join(dir, "insightFlow/projects"), { recursive: true });
    writeFileSync(
      join(dir, "insightFlow/projects/hotfix.json"),
      JSON.stringify({
        id: "custom:hotfix",
        title: "Hotfix",
        agents: ["task-implement", "task-git"],
        // a ready→ edge so N118's suggestNextSteps is non-empty for a ready task
        flow: [{ from: "task-implement", to: "task-git", on: "ready" }],
        install: [],
      }),
    );
  }
  return dir;
}

function create(dir, args) {
  return JSON.parse(
    execFileSync(process.execPath, [CLI, "create", "--title", "T", ...args], {
      cwd: dir,
      encoding: "utf-8",
    }),
  );
}

test("create binds flowId: type-map → mapped flow when it exists", () => {
  const dir = project({ byType: { fix: "custom:hotfix" }, customFlow: true });
  assert.equal(create(dir, ["--type", "fix"]).flowId, "custom:hotfix");
});

test("create binds flowId: explicit --flow wins", () => {
  const dir = project({ byType: { fix: "default" }, customFlow: true });
  assert.equal(create(dir, ["--type", "fix", "--flow", "custom:hotfix"]).flowId, "custom:hotfix");
});

test("create falls back to 'default' when the mapped flow does not exist", () => {
  const dir = project({ byType: { fix: "custom:ghost" } }); // no such flow on disk
  const out = create(dir, ["--type", "fix"]);
  assert.equal(out.flowId, "default");
  // and the stored task carries it
  const shard = JSON.parse(
    readFileSync(join(dir, "insightFlow/workTasks/tasks-N00-N09.json"), "utf-8"),
  );
  assert.equal(shard.tasks[0].flowId, "default");
});

test("create with no mapping uses defaultFlow", () => {
  const dir = project({});
  assert.equal(create(dir, ["--type", "feat"]).flowId, "default");
});

// N117 — set-flow: ready→ok, locked after work starts, unknown flow rejected.
function cli(dir, args) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf-8" });
}

test("set-flow reassigns a ready task; locks after work starts; rejects unknown flow", () => {
  const dir = project({ customFlow: true });
  const created = JSON.parse(cli(dir, ["create", "--title", "T", "--type", "feat"]));
  assert.equal(created.flowId, "default");

  // ready → reassign succeeds
  const set = JSON.parse(cli(dir, ["set-flow", "--id", created.id, "--flow", "custom:hotfix"]));
  assert.equal(set.flowId, "custom:hotfix");
  let shard = JSON.parse(
    readFileSync(join(dir, "insightFlow/workTasks/tasks-N00-N09.json"), "utf-8"),
  );
  assert.equal(shard.tasks[0].flowId, "custom:hotfix");

  // unknown flow → error
  assert.throws(
    () => cli(dir, ["set-flow", "--id", created.id, "--flow", "custom:ghost"]),
    (err) => /unknown flow/.test(String(err.stderr)),
  );

  // advance past ready → locked
  cli(dir, ["implement-start", "--id", created.id]);
  assert.throws(
    () => cli(dir, ["set-flow", "--id", created.id, "--flow", "default"]),
    (err) => /locks once work starts/.test(String(err.stderr)),
  );
  // flow unchanged after the locked attempt
  shard = JSON.parse(readFileSync(join(dir, "insightFlow/workTasks/tasks-N00-N09.json"), "utf-8"));
  assert.equal(shard.tasks[0].flowId, "custom:hotfix");
});

// N118 — `current`/`next` surface the task's flow + the flow's next step;
// a deleted/missing flow degrades to "default". Picker order is untouched.
test("current/next surface the task's flow and next step (deleted flow → default)", () => {
  const dir = project({ byType: { fix: "custom:hotfix" }, customFlow: true });
  const created = JSON.parse(cli(dir, ["create", "--title", "T", "--type", "fix"]));
  assert.equal(created.flowId, "custom:hotfix");

  // `current` carries the task's flow + the hotfix flow's ready→ next step
  const current = JSON.parse(cli(dir, ["current"]));
  assert.equal(current.flowId, "custom:hotfix");
  assert.deepEqual(
    current.nextSteps.map((s) => s.command),
    ["/task-git"],
  );

  // `next` (picker) also carries flow + nextSteps; pick is still the ready task
  const next = JSON.parse(cli(dir, ["next"]));
  assert.equal(next.next, created.id);
  assert.equal(next.flowId, "custom:hotfix");

  // delete the custom flow → current degrades to default gracefully
  rmSync(join(dir, "insightFlow/projects/hotfix.json"));
  const after = JSON.parse(cli(dir, ["current"]));
  assert.equal(after.flowId, "default");
});

// N123 — a main/entry agent binds its flow at creation; precedence + ambiguity.
function withFlow(dir, file, def) {
  mkdirSync(join(dir, "insightFlow/projects"), { recursive: true });
  writeFileSync(join(dir, "insightFlow/projects", file), JSON.stringify(def));
}

test("create --agent binds the agent's flow; --flow wins; ambiguity + no-flow error", () => {
  const dir = project({}); // default flow present (entryAgents: task-analyze, taskmaster)

  // taskmaster is a main agent of the default flow
  assert.equal(
    JSON.parse(cli(dir, ["create", "--title", "T", "--agent", "taskmaster"])).flowId,
    "default",
  );

  // a custom flow whose only main agent is task-implement
  withFlow(dir, "hotfix.json", {
    id: "custom:hotfix",
    title: "Hotfix",
    agents: ["task-implement", "task-git"],
    flow: [],
    install: [],
    entryAgents: ["task-implement"],
  });
  assert.equal(
    JSON.parse(cli(dir, ["create", "--title", "T", "--agent", "task-implement"])).flowId,
    "custom:hotfix",
  );

  // --flow overrides --agent
  assert.equal(
    JSON.parse(
      cli(dir, ["create", "--title", "T", "--agent", "task-implement", "--flow", "default"]),
    ).flowId,
    "default",
  );

  // an agent that's a main of NO flow → error
  assert.throws(
    () => cli(dir, ["create", "--title", "T", "--agent", "task-review"]),
    (err) => /not a main agent of any flow/.test(String(err.stderr)),
  );

  // ambiguity: a second flow also names task-implement as a main agent
  withFlow(dir, "other.json", {
    id: "custom:other",
    title: "Other",
    agents: ["task-implement"],
    flow: [],
    install: [],
    entryAgents: ["task-implement"],
  });
  assert.throws(
    () => cli(dir, ["create", "--title", "T", "--agent", "task-implement"]),
    (err) => /main agent of multiple flows/.test(String(err.stderr)),
  );
});
