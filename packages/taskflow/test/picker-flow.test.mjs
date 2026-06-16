/**
 * N132 — pickers read the flow's transition graph. Default-only next/
 * next-review/next-fix reproduce today's ordering; a custom-status flow's task
 * is picked by `next` in its declared order and is not surfaced by the
 * canonical review/fix pickers.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

function mkTask(id, { status = "ready", priority = "medium", createdAt, flowId } = {}) {
  return {
    id,
    title: id,
    type: "feat",
    priority,
    status,
    folder: `insightFlow/workTasks/${id}-t`,
    createdAt: createdAt ?? "2026-06-15T00:00:00.000Z",
    statusHistory: [],
    implementation: { startedAt: null, completedAt: null, filesChanged: [], tokensUsed: null },
    changesAfterImplementation: [],
    committedAt: null,
    totalDurationMinutes: null,
    tags: [],
    ...(flowId ? { flowId } : {}),
  };
}

function project(tasks, customFlow) {
  const dir = mkdtempSync(join(tmpdir(), "n132-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({ workDir: "workTasks", flows: { defaultFlow: "default", byType: {} } }),
  );
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/workTasks/master.json"),
    JSON.stringify({
      meta: { nextId: 10, currentTaskId: null, nextIncidentId: 1, shards: ["tasks-N00-N09.json"] },
    }),
  );
  writeFileSync(
    join(dir, "insightFlow/workTasks/tasks-N00-N09.json"),
    JSON.stringify({ range: { from: 0, to: 9 }, tasks }),
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

const pick = (dir, cmd) =>
  JSON.parse(execFileSync(process.execPath, [CLI, cmd], { cwd: dir, encoding: "utf-8" }));

const QA_FLOW = {
  id: "custom:qa",
  title: "QA",
  agents: ["task-implement", "task-git"],
  flow: [],
  install: [],
  statuses: [
    { id: "queued", title: "Queued" },
    { id: "verifying", title: "Verifying" },
    { id: "shipped", title: "Shipped", terminal: true },
  ],
};

// ---- default-flow parity ----------------------------------------------------

test("N132: default `next` keeps STATUS_WEIGHT order (fix-needed wins over ready)", () => {
  const dir = project([
    mkTask("N00", { status: "ready", priority: "critical" }),
    mkTask("N01", { status: "fix-needed", priority: "low" }),
    mkTask("N02", { status: "in-progress", priority: "high" }),
  ]);
  // fix-needed(0) < in-progress(3) < ready(4) regardless of priority
  assert.equal(pick(dir, "next").next, "N01");
});

test("N132: default `next-review` keeps fixed-first ordering", () => {
  const dir = project([
    mkTask("N00", { status: "implemented", priority: "critical" }),
    mkTask("N01", { status: "fixed", priority: "low" }),
  ]);
  assert.equal(pick(dir, "next-review").next, "N01");
});

test("N132: default `next-fix` keeps priority ordering", () => {
  const dir = project([
    mkTask("N00", { status: "fix-needed", priority: "low" }),
    mkTask("N01", { status: "fix-needed", priority: "high" }),
  ]);
  assert.equal(pick(dir, "next-fix").next, "N01");
});

// ---- custom-status flow -----------------------------------------------------

test("N132: a custom-status task is picked by `next` in its flow's order", () => {
  const dir = project(
    [
      mkTask("N00", { status: "ready", priority: "low" }), // default, weight 4
      mkTask("N01", { status: "queued", priority: "low", flowId: "custom:qa" }), // index 0
    ],
    QA_FLOW,
  );
  // queued (custom index 0) outranks default ready (weight 4)
  assert.equal(pick(dir, "next").next, "N01");
});

test("N132: a terminal custom status is not actionable for `next`", () => {
  const dir = project(
    [mkTask("N00", { status: "shipped", priority: "high", flowId: "custom:qa" })],
    QA_FLOW,
  );
  assert.equal(pick(dir, "next").next, null);
});

test("N132: custom-status tasks are not surfaced by the canonical review/fix pickers", () => {
  const dir = project(
    [mkTask("N00", { status: "verifying", priority: "high", flowId: "custom:qa" })],
    QA_FLOW,
  );
  assert.equal(pick(dir, "next-review").next, null);
  assert.equal(pick(dir, "next-fix").next, null);
  // …but `next` does surface it
  assert.equal(pick(dir, "next").next, "N00");
});
