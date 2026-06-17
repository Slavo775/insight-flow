/**
 * N141 — `insight-flow migrate-layout` stray cleanup. Projects that hit the N139
 * bug are already on the insightFlow layout (so they reach the no-op path) and
 * carry doubled `insightFlow/workTasks/workTasks/Nxx-…` dirs. Detection is
 * report-only by default; removal needs an explicit --fix-strays and only ever
 * touches empty / scaffold-only dirs — a stray REVIEW.md with a real review is
 * preserved. Integration via the real CLI. Requires a prior build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

const MASTER = JSON.stringify({ meta: { nextId: 0, currentTaskId: null, shards: [] } });

const SCAFFOLD_REVIEW = `# N99 — Probe — Review

**Reviewer:** AI
**Date:** 2026-06-17
**PR:**
**Verdict:** pending

## Summary

<one paragraph: what changed, risk level>

## Checklist verification

- [ ] <CHECKLIST.md item> — pass | fail

## Notes

<context, follow-ups, related tasks>
`;

const REAL_REVIEW = `# N99 — Probe — Review

**Reviewer:** AI
**Date:** 2026-06-17
**PR:**
**Verdict:** approved

## Summary

Root-cause fix looks correct; low risk.
`;

/** Already-migrated project with a seeded doubled stray dir. */
function projectWithStray({ reviewContent, extraFile } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "n141-strays-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify({ workDir: "workTasks" }));
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(join(dir, "insightFlow/workTasks/master.json"), MASTER);

  const stray = join(dir, "insightFlow/workTasks/workTasks/N99-probe");
  mkdirSync(stray, { recursive: true });
  if (reviewContent !== undefined) writeFileSync(join(stray, "REVIEW.md"), reviewContent);
  if (extraFile) writeFileSync(join(stray, extraFile), "x\n");
  return dir;
}

function run(dir, args) {
  return JSON.parse(
    execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf-8" }),
  );
}

const STRAY_PARENT = "insightFlow/workTasks/workTasks";
const STRAY_DIR = "insightFlow/workTasks/workTasks/N99-probe";

test("default run detects strays but removes nothing (report-only)", () => {
  const dir = projectWithStray({ reviewContent: SCAFFOLD_REVIEW });
  const out = run(dir, ["migrate-layout"]);
  assert.equal(out.result, "noop");
  assert.equal(out.strays.eligible, 1);
  assert.equal(out.strays.removed, 0);
  assert.match(out.strays.hint, /--fix-strays/);
  assert.ok(existsSync(join(dir, STRAY_DIR)), "report-only must not delete the stray");
});

test("--fix-strays removes a scaffold-only stray and the emptied doubled parent", () => {
  const dir = projectWithStray({ reviewContent: SCAFFOLD_REVIEW });
  const out = run(dir, ["migrate-layout", "--fix-strays"]);
  assert.equal(out.strays.removed, 1);
  assert.equal(out.strays.parentRemoved, true);
  assert.ok(!existsSync(join(dir, STRAY_DIR)), "scaffold-only stray removed");
  assert.ok(!existsSync(join(dir, STRAY_PARENT)), "emptied doubled parent removed");
  // real task data untouched
  assert.ok(existsSync(join(dir, "insightFlow/workTasks/master.json")));
});

test("--fix-strays removes an empty stray dir", () => {
  const dir = projectWithStray({});
  const out = run(dir, ["migrate-layout", "--fix-strays"]);
  assert.equal(out.strays.removed, 1);
  assert.ok(!existsSync(join(dir, STRAY_DIR)));
});

test("a stray REVIEW.md with a real review is preserved even with --fix-strays", () => {
  const dir = projectWithStray({ reviewContent: REAL_REVIEW });
  const out = run(dir, ["migrate-layout", "--fix-strays"]);
  assert.equal(out.strays.eligible, 0);
  assert.equal(out.strays.removed, 0);
  assert.equal(out.strays.dirs[0].eligible, false);
  assert.match(out.strays.dirs[0].reason, /real review/);
  assert.ok(existsSync(join(dir, STRAY_DIR, "REVIEW.md")), "content-bearing stray preserved");
});

test("a stray with unexpected files is preserved", () => {
  const dir = projectWithStray({ reviewContent: SCAFFOLD_REVIEW, extraFile: "TASK.md" });
  const out = run(dir, ["migrate-layout", "--fix-strays"]);
  assert.equal(out.strays.removed, 0);
  assert.match(out.strays.dirs[0].reason, /unexpected files/);
  assert.ok(existsSync(join(dir, STRAY_DIR)), "preserved");
});

test("--dry-run --fix-strays deletes nothing", () => {
  const dir = projectWithStray({ reviewContent: SCAFFOLD_REVIEW });
  const out = run(dir, ["migrate-layout", "--dry-run", "--fix-strays"]);
  assert.equal(out.strays.removed, 0);
  assert.ok(existsSync(join(dir, STRAY_DIR)), "dry-run must not delete");
});

test("clean project (no doubled dir) omits the strays field", () => {
  const dir = mkdtempSync(join(tmpdir(), "n141-clean-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify({ workDir: "workTasks" }));
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(join(dir, "insightFlow/workTasks/master.json"), MASTER);
  const out = run(dir, ["migrate-layout"]);
  assert.equal(out.result, "noop");
  assert.equal(out.strays, undefined);
});
