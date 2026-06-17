/**
 * N139 — resolveTaskFolder must derive the task folder from the basename of
 * task.folder, so under the N101 insightFlow/workTasks/ layout it resolves to a
 * single-nested path (not insightFlow/workTasks/workTasks/Nxx). The insightFlow
 * cases fail on the pre-fix code; the legacy case guards that the fix keeps the
 * old layout working.
 *
 * N140 — there is now a single shared resolveTaskFolder in core (was duplicated
 * in storage.ts + spec.ts). The direct cases below pin that shared function for
 * both layouts; loadSpec/scaffoldReviewMd exercise it through their callers.
 * Requires a prior build (imports dist).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSpec, scaffoldReviewMd, resolveTaskFolder } from "../dist/index.js";

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

test("N140: shared resolveTaskFolder resolves the insightFlow layout to a single-nested basename path", () => {
  const dir = insightProject();
  const folder = resolveTaskFolder(CONFIG, TASK, dir);
  assert.equal(folder, join(dir, "insightFlow/workTasks/N99-path-probe"));
  assert.ok(!folder.includes("workTasks/workTasks"), "no doubled layout segment");
});

test("N140: shared resolveTaskFolder resolves the legacy workTasks layout", () => {
  const dir = mkdtempSync(join(tmpdir(), "n140-legacy-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify(CONFIG));
  mkdirSync(join(dir, "workTasks"), { recursive: true });
  writeFileSync(join(dir, "workTasks/master.json"), MASTER);

  const legacyTask = { id: "N00", title: "Seed", folder: "workTasks/N00-seed" };
  assert.equal(resolveTaskFolder(CONFIG, legacyTask, dir), join(dir, "workTasks/N00-seed"));
});

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
