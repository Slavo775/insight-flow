/**
 * N139 — spec.ts resolveTaskFolder must derive the task folder from the
 * basename of task.folder, so under the N101 insightFlow/workTasks/ layout it
 * resolves to a single-nested path (not insightFlow/workTasks/workTasks/Nxx).
 * The insightFlow cases fail on the pre-fix code; the legacy case guards that
 * the fix keeps the old layout working. Requires a prior build (imports dist).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSpec, scaffoldReviewMd } from "../dist/index.js";

const MASTER = JSON.stringify({ meta: { nextId: 0, currentTaskId: null, shards: [] } });
const CONFIG = { workDir: "workTasks" };

function insightProject() {
  const dir = mkdtempSync(join(tmpdir(), "n139-spec-path-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify(CONFIG));
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(join(dir, "insightFlow/workTasks/master.json"), MASTER);
  return dir;
}

const TASK = {
  id: "N99",
  title: "Path probe",
  folder: "insightFlow/workTasks/N99-path-probe",
};

test("N139: loadSpec reads TASK.md/CHECKLIST.md from the single-nested insightFlow path", () => {
  const dir = insightProject();
  const folder = join(dir, "insightFlow/workTasks/N99-path-probe");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "TASK.md"), "# N99 spec\n");
  writeFileSync(join(folder, "CHECKLIST.md"), "# N99 checklist\n");

  const spec = loadSpec(CONFIG, TASK, dir);
  assert.equal(spec.task, "# N99 spec\n");
  assert.equal(spec.checklist, "# N99 checklist\n");
});

test("N139: scaffoldReviewMd writes REVIEW.md to the single-nested path, not a doubled one", () => {
  const dir = insightProject();
  const res = scaffoldReviewMd(
    CONFIG,
    TASK,
    { reviewer: "AI", date: "2026-06-17", prUrl: "" },
    dir,
  );
  assert.equal(res.created, true);
  assert.ok(
    existsSync(join(dir, "insightFlow/workTasks/N99-path-probe/REVIEW.md")),
    "REVIEW.md written at the correct single-nested path",
  );
  assert.ok(
    !existsSync(join(dir, "insightFlow/workTasks/workTasks")),
    "no doubled insightFlow/workTasks/workTasks/ directory",
  );
});

test("N139: legacy workTasks/ layout still resolves correctly", () => {
  const dir = mkdtempSync(join(tmpdir(), "n139-legacy-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify(CONFIG));
  mkdirSync(join(dir, "workTasks/N00-seed"), { recursive: true });
  writeFileSync(join(dir, "workTasks/master.json"), MASTER);
  writeFileSync(join(dir, "workTasks/N00-seed/TASK.md"), "# legacy\n");

  const legacyTask = { id: "N00", title: "Seed", folder: "workTasks/N00-seed" };
  const spec = loadSpec(CONFIG, legacyTask, dir);
  assert.equal(spec.task, "# legacy\n");
});
