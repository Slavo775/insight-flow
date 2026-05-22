/**
 * Tests for N15 deliverables:
 *   - `insight-flow create` scaffolds TASK.md + CHECKLIST.md from templates.
 *   - `insight-flow review-start` scaffolds REVIEW.md on first call; appends
 *     `## Round 2` on the second call.
 *   - `insight-flow next --with-spec`, `next-review --with-spec`,
 *     `next-fix --with-spec`, and `show --spec` inline TASK.md + CHECKLIST.md.
 *   - `insight-flow stats --tokens` runs without error on a project with no
 *     tokens recorded and on one with some recorded values.
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
  const dir = mkdtempSync(join(tmpdir(), "taskflow-scaffold-test-"));
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
  writeFileSync(
    resolve(workDir, "master.json"),
    JSON.stringify(
      {
        meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: ["tasks-N00-N09.json"] },
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    resolve(workDir, "tasks-N00-N09.json"),
    JSON.stringify({ range: { from: 0, to: 9 }, tasks: [] }, null, 2) + "\n",
  );

  return { dir, workDir };
}

function runCli(cwd, ...args) {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf-8",
  }).trim();
}

test("create scaffolds TASK.md + CHECKLIST.md from package templates", () => {
  const { dir, workDir } = makeProject();
  try {
    const out = JSON.parse(runCli(dir, "create", "--title", "Demo", "--type", "feat"));
    assert.equal(out.id, "N00");
    assert.ok(out.taskMd && out.taskMd.endsWith("/TASK.md"));
    assert.ok(out.checklistMd && out.checklistMd.endsWith("/CHECKLIST.md"));

    const folder = resolve(dir, out.folder);
    const taskMd = readFileSync(resolve(folder, "TASK.md"), "utf-8");
    const checklistMd = readFileSync(resolve(folder, "CHECKLIST.md"), "utf-8");

    assert.match(taskMd, /^# N00 — Demo$/m);
    assert.match(taskMd, /^## Problem$/m);
    assert.match(taskMd, /^## Implementation plan$/m);
    assert.match(checklistMd, /^## Done criteria$/m);
    assert.match(checklistMd, /^## Quality gates$/m);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("review-start scaffolds REVIEW.md on first call, appends Round 2 on second", () => {
  const { dir } = makeProject();
  try {
    const created = JSON.parse(runCli(dir, "create", "--title", "Demo", "--type", "feat"));
    runCli(dir, "implement-start", "--id", "N00");
    runCli(dir, "implement-end", "--id", "N00", "--files", "a.ts");

    const r1 = JSON.parse(runCli(dir, "review-start", "--id", "N00", "--type", "ai"));
    assert.equal(r1.reviewMd.created, true);
    assert.equal(r1.reviewMd.round, 1);

    const reviewPath = resolve(dir, created.folder, "REVIEW.md");
    const r1Content = readFileSync(reviewPath, "utf-8");
    assert.match(r1Content, /^# N00 — Demo — Review$/m);
    assert.match(r1Content, /\*\*Verdict:\*\* pending/);
    assert.match(r1Content, /^## Summary$/m);
    assert.match(r1Content, /^## Blockers$/m);

    runCli(dir, "review-end", "--id", "N00", "--verdict", "fix-needed", "--comment", "round 1");
    runCli(dir, "fix-start", "--id", "N00");
    runCli(dir, "fix-end", "--id", "N00", "--files", "a.ts", "--comment", "fixed");

    const r2 = JSON.parse(runCli(dir, "review-start", "--id", "N00", "--type", "ai"));
    assert.equal(r2.reviewMd.created, false);
    assert.equal(r2.reviewMd.round, 2);

    const r2Content = readFileSync(reviewPath, "utf-8");
    assert.match(r2Content, /^## Round 2 — pending verdict$/m);
    // The original round-1 content must still be present.
    assert.match(r2Content, /^## Summary$/m);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("next --with-spec inlines TASK.md + CHECKLIST.md", () => {
  const { dir } = makeProject();
  try {
    runCli(dir, "create", "--title", "Demo", "--type", "feat");

    const bare = JSON.parse(runCli(dir, "next"));
    assert.equal(bare.next, "N00");
    assert.equal(bare.task, undefined);
    assert.equal(bare.checklist, undefined);

    const withSpec = JSON.parse(runCli(dir, "next", "--with-spec"));
    assert.equal(withSpec.next, "N00");
    assert.ok(typeof withSpec.task === "string" && withSpec.task.includes("# N00 — Demo"));
    assert.ok(
      typeof withSpec.checklist === "string" && withSpec.checklist.includes("## Done criteria"),
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("show --summary --spec returns lean summary + spec content", () => {
  const { dir } = makeProject();
  try {
    runCli(dir, "create", "--title", "Demo", "--type", "feat");

    const out = JSON.parse(runCli(dir, "show", "--id", "N00", "--summary", "--spec"));
    assert.equal(out.id, "N00");
    assert.equal(out.reviewCount, 0);
    assert.ok(typeof out.task === "string" && out.task.includes("# N00 — Demo"));
    assert.ok(typeof out.checklist === "string" && out.checklist.includes("## Quality gates"));
    // Lean summary should NOT include the full task object.
    assert.equal(out.statusHistory, undefined);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("stats --tokens runs on empty project and on populated project", () => {
  const { dir, workDir } = makeProject();
  try {
    // Empty project — no tasks at all.
    const emptyOut = JSON.parse(runCli(dir, "stats", "--tokens"));
    assert.equal(emptyOut.tasksWithTokens, 0);
    assert.equal(emptyOut.overall, null);

    // Populate with 3 tasks, 2 with tokensUsed.
    runCli(dir, "create", "--title", "A", "--type", "feat", "--priority", "high");
    runCli(dir, "create", "--title", "B", "--type", "feat", "--priority", "high");
    runCli(dir, "create", "--title", "C", "--type", "fix", "--priority", "low");

    // Patch tokensUsed onto two of them via raw shard edit (mirror what
    // implement-end would do if --tokens was supplied).
    const shardPath = resolve(workDir, "tasks-N00-N09.json");
    const shard = JSON.parse(readFileSync(shardPath, "utf-8"));
    shard.tasks[0].implementation.tokensUsed = 1000;
    shard.tasks[1].implementation.tokensUsed = 2000;
    writeFileSync(shardPath, JSON.stringify(shard, null, 2) + "\n");

    const populated = JSON.parse(runCli(dir, "stats", "--tokens"));
    assert.equal(populated.tasksWithTokens, 2);
    assert.equal(populated.tasksWithoutTokens, 1);
    assert.equal(populated.overall.min, 1000);
    assert.equal(populated.overall.max, 2000);
    assert.equal(populated.overall.allTimeAvg, 1500);
    assert.ok(populated.byType.feat);
    assert.equal(populated.byType.feat.count, 2);
    assert.equal(populated.byType.fix, undefined);
    assert.equal(populated.byPriority.high.count, 2);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
