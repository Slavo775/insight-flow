/**
 * N100 — `insight-flow migrate-layout`. Integration via the real CLI:
 * legacy project → migrate → insightFlow layout with byte-identical JSON;
 * dry-run leaves disk untouched; second run is a no-op; a partial
 * insightFlow/ dir is refused with guidance.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

const MASTER = JSON.stringify(
  { meta: { nextId: 1, currentTaskId: "N00", nextIncidentId: 1, shards: ["tasks-N00-N09.json"] } },
  null,
  2,
);
const SHARD = JSON.stringify(
  {
    range: { from: 0, to: 9 },
    tasks: [
      {
        id: "N00",
        title: "Seed",
        type: "feat",
        priority: "low",
        status: "ready",
        folder: "workTasks/N00-seed",
        tags: [],
        createdAt: "2026-06-12T00:00:00.000Z",
        statusHistory: [],
        implementation: { startedAt: null, completedAt: null, filesChanged: [], tokensUsed: null },
        changesAfterImplementation: [],
        committedAt: null,
        totalDurationMinutes: null,
        pushes: [],
        incidents: [],
      },
    ],
  },
  null,
  2,
);

function legacyProject() {
  const dir = mkdtempSync(join(tmpdir(), "n100-migrate-layout-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify({ workDir: "workTasks" }));
  mkdirSync(join(dir, "workTasks/N00-seed"), { recursive: true });
  mkdirSync(join(dir, "workTasks/.events"), { recursive: true });
  writeFileSync(join(dir, "workTasks/master.json"), MASTER);
  writeFileSync(join(dir, "workTasks/tasks-N00-N09.json"), SHARD);
  writeFileSync(join(dir, "workTasks/N00-seed/TASK.md"), "# N00 — Seed\n");
  writeFileSync(join(dir, "workTasks/.events/2026-06-12.jsonl"), '{"type":"start"}\n');
  return dir;
}

function run(dir, args) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf-8" });
}

test("dry-run prints the plan and leaves disk untouched", () => {
  const dir = legacyProject();
  const out = JSON.parse(run(dir, ["migrate-layout", "--dry-run"]));
  assert.equal(out.result, "dry-run");
  assert.deepEqual(out.moves, [
    { from: "workTasks", to: "insightFlow/workTasks" },
    { from: "insightFlow/workTasks/.events", to: "insightFlow/events" },
  ]);
  assert.ok(!existsSync(join(dir, "insightFlow")), "dry-run must not create insightFlow/");
  assert.ok(existsSync(join(dir, "workTasks/master.json")));
});

test("migrate moves the tree, JSON byte-identical, CLI keeps working; re-run is a no-op", () => {
  const dir = legacyProject();
  const masterBefore = readFileSync(join(dir, "workTasks/master.json"), "utf-8");
  const shardBefore = readFileSync(join(dir, "workTasks/tasks-N00-N09.json"), "utf-8");

  const out = JSON.parse(run(dir, ["migrate-layout"]));
  assert.equal(out.result, "migrated");
  assert.equal(out.tasksDir, "insightFlow/workTasks");
  assert.equal(out.eventsDir, "insightFlow/events");

  assert.ok(!existsSync(join(dir, "workTasks")), "legacy root is gone");
  assert.equal(readFileSync(join(dir, "insightFlow/workTasks/master.json"), "utf-8"), masterBefore);
  assert.equal(
    readFileSync(join(dir, "insightFlow/workTasks/tasks-N00-N09.json"), "utf-8"),
    shardBefore,
  );
  assert.ok(existsSync(join(dir, "insightFlow/workTasks/N00-seed/TASK.md")));
  assert.ok(existsSync(join(dir, "insightFlow/events/2026-06-12.jsonl")));
  assert.ok(
    !existsSync(join(dir, "insightFlow/workTasks/.events")),
    "legacy .events hoisted out of the tasks dir",
  );

  // CLI smoke on the migrated layout.
  const list = JSON.parse(run(dir, ["list"]));
  assert.equal(list[0].id, "N00");

  // Idempotent re-run.
  const again = JSON.parse(run(dir, ["migrate-layout"]));
  assert.equal(again.result, "noop");
});

test("migrate works without a legacy .events dir", () => {
  const dir = legacyProject();
  // remove .events from the fixture
  const out0 = run(dir, ["migrate-layout", "--dry-run"]);
  assert.ok(out0.includes(".events"));
  const dir2 = mkdtempSync(join(tmpdir(), "n100-migrate-layout-"));
  writeFileSync(join(dir2, "taskflow.config.json"), JSON.stringify({ workDir: "workTasks" }));
  mkdirSync(join(dir2, "workTasks"), { recursive: true });
  writeFileSync(join(dir2, "workTasks/master.json"), MASTER);
  const out = JSON.parse(run(dir2, ["migrate-layout"]));
  assert.equal(out.result, "migrated");
  assert.equal(out.moves.length, 1);
});

test("partial insightFlow/ dir is refused with guidance, nothing moved", () => {
  const dir = legacyProject();
  mkdirSync(join(dir, "insightFlow/events"), { recursive: true });
  assert.throws(
    () => run(dir, ["migrate-layout"]),
    (err) => {
      assert.match(String(err.stderr), /partial insightFlow\/ layout/);
      return true;
    },
  );
  assert.ok(existsSync(join(dir, "workTasks/master.json")), "legacy tree untouched");
});

test("pre-existing user-space registry dirs (N102) do not block migration", () => {
  const dir = legacyProject();
  mkdirSync(join(dir, "insightFlow/modules"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/modules/greeting.json"),
    JSON.stringify({
      id: "custom:greeting",
      title: "Greeting",
      kind: "section",
      heading: "G",
      body: "x",
    }),
  );
  const out = JSON.parse(run(dir, ["migrate-layout"]));
  assert.equal(out.result, "migrated");
  assert.ok(existsSync(join(dir, "insightFlow/workTasks/master.json")));
  assert.ok(existsSync(join(dir, "insightFlow/modules/greeting.json")), "registry dir untouched");
});
