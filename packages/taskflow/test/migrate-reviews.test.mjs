/**
 * Regression tests for `insight-flow migrate-reviews`.
 *
 * Specifically guards Blocker 1 from N14's review: a second run of the
 * migration must NOT corrupt the per-task summary fields (`reviewCount`,
 * `lastReviewVerdict`, `openIncidentCount`) once the inline `reviews`/
 * `incidents` arrays have already been split into side files.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-migrate-test-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify(
      {
        workDir: "workTasks",
        shardSize: 10,
        projectName: "test",
        rolesDir: ".claude/roles",
        server: { port: 6006 },
      },
      null,
      2,
    ),
  );

  const workDir = resolve(dir, "workTasks");
  mkdirSync(workDir, { recursive: true });

  // master.json
  writeFileSync(
    resolve(workDir, "master.json"),
    JSON.stringify(
      {
        meta: {
          nextId: 1,
          currentTaskId: null,
          nextIncidentId: 1,
          shards: ["tasks-N00-N09.json"],
        },
      },
      null,
      2,
    ) + "\n",
  );

  // Seed a single task with inline reviews + incidents (legacy v1 schema shape).
  const taskFolder = "workTasks/N00-test";
  mkdirSync(resolve(dir, taskFolder), { recursive: true });
  const task = {
    id: "N00",
    title: "Test task",
    type: "fix",
    priority: "high",
    status: "merged",
    folder: taskFolder,
    createdAt: "2025-01-01T00:00:00.000Z",
    statusHistory: [{ status: "merged", at: "2025-01-01T00:00:00.000Z", by: "test" }],
    implementation: {
      startedAt: null,
      completedAt: null,
      filesChanged: [],
      tokensUsed: null,
    },
    reviews: [
      {
        startedAt: "2025-01-01T00:00:00.000Z",
        endedAt: "2025-01-01T00:10:00.000Z",
        verdict: "approved",
        comment: "lgtm",
        type: "ai",
        by: "task-review",
        fix: null,
      },
      {
        startedAt: "2025-01-02T00:00:00.000Z",
        endedAt: "2025-01-02T00:10:00.000Z",
        verdict: "fix-needed",
        comment: "one issue",
        type: "human",
        by: "owner",
        fix: null,
      },
    ],
    changesAfterImplementation: [],
    incidents: [
      {
        id: "INC-001",
        title: "boom",
        severity: "high",
        status: "reported",
        reportedAt: "2025-01-03T00:00:00.000Z",
        resolvedAt: null,
        branch: "fix/incident/N00-boom",
        description: null,
        rootCause: null,
        fix: null,
        statusHistory: [{ status: "reported", at: "2025-01-03T00:00:00.000Z", by: "test" }],
      },
    ],
    committedAt: null,
    totalDurationMinutes: null,
    tags: [],
    pushes: [],
    branch: null,
    mrUrl: null,
    mergedAt: null,
  };

  writeFileSync(
    resolve(workDir, "tasks-N00-N09.json"),
    JSON.stringify({ range: { from: 0, to: 9 }, tasks: [task] }, null, 2) + "\n",
  );

  return { dir, workDir };
}

function readShard(workDir) {
  return JSON.parse(readFileSync(resolve(workDir, "tasks-N00-N09.json"), "utf-8"));
}

function runCli(cwd, ...args) {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, INSIGHT_FLOW_NO_OPEN: "1" },
  }).trim();
}

test("migrate-reviews splits inline arrays into side files on first run", () => {
  const { dir, workDir } = makeProject();
  try {
    const out = runCli(dir, "migrate-reviews");
    const result = JSON.parse(out);

    assert.deepEqual(result.tasksSplit, ["N00"]);
    assert.ok(existsSync(resolve(workDir, "N00-test", "reviews.json")));
    assert.ok(existsSync(resolve(workDir, "N00-test", "incidents.json")));

    const reviews = JSON.parse(readFileSync(resolve(workDir, "N00-test", "reviews.json"), "utf-8"));
    assert.equal(reviews.reviews.length, 2);

    const incidents = JSON.parse(
      readFileSync(resolve(workDir, "N00-test", "incidents.json"), "utf-8"),
    );
    assert.equal(incidents.incidents.length, 1);

    const shard = readShard(workDir);
    assert.equal(shard.tasks[0].reviews, undefined, "inline reviews stripped from shard");
    assert.equal(shard.tasks[0].incidents, undefined, "inline incidents stripped from shard");
    assert.equal(shard.tasks[0].reviewCount, 2, "reviewCount summary set");
    assert.equal(shard.tasks[0].lastReviewVerdict, "fix-needed");
    assert.equal(shard.tasks[0].openIncidentCount, 1);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("migrate-reviews is idempotent — second run preserves summary fields", () => {
  const { dir, workDir } = makeProject();
  try {
    runCli(dir, "migrate-reviews"); // first split
    const first = readShard(workDir).tasks[0];
    assert.equal(first.reviewCount, 2);

    const out = runCli(dir, "migrate-reviews"); // re-run
    const result = JSON.parse(out);

    assert.deepEqual(result.tasksSplit, [], "no tasks should be re-split");
    assert.deepEqual(result.shardsTouched, [], "shard should not be rewritten");

    const after = readShard(workDir).tasks[0];
    assert.equal(after.reviewCount, 2, "reviewCount must not get zeroed on re-run");
    assert.equal(after.lastReviewVerdict, "fix-needed");
    assert.equal(after.openIncidentCount, 1);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
