/**
 * N101 — fresh projects are born on the insightFlow/ layout; legacy projects
 * being re-inited keep their workTasks/ root (migrate-layout moves them).
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

function run(dir, args) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf-8" });
}

test("fresh init scaffolds insightFlow/workTasks and the CLI round-trips", () => {
  const dir = mkdtempSync(join(tmpdir(), "n101-init-layout-"));
  run(dir, ["init", "--editor", "claude", "-y"]);

  assert.ok(existsSync(join(dir, "insightFlow/workTasks/master.json")), "master.json in new layout");
  assert.ok(existsSync(join(dir, "insightFlow/workTasks/tasks-N00-N09.json")), "initial shard");
  assert.ok(!existsSync(join(dir, "workTasks")), "no legacy root for fresh projects");

  const created = JSON.parse(
    run(dir, ["create", "--title", "Layout smoke", "--type", "feat", "--priority", "low"]),
  );
  assert.equal(created.id, "N00");
  assert.match(created.folder, /insightFlow[\\/]workTasks[\\/]N00-/);

  const list = JSON.parse(run(dir, ["list"]));
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "N00");
});

test("re-init of a legacy project keeps the legacy layout and suggests migrate-layout", () => {
  const dir = mkdtempSync(join(tmpdir(), "n101-init-legacy-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify({ workDir: "workTasks" }));
  mkdirSync(join(dir, "workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "workTasks/master.json"),
    JSON.stringify({
      meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: ["tasks-N00-N09.json"] },
    }),
  );
  writeFileSync(
    join(dir, "workTasks/tasks-N00-N09.json"),
    JSON.stringify({ range: { from: 0, to: 9 }, tasks: [] }),
  );

  const out = run(dir, ["init", "--editor", "claude", "-y"]);
  assert.match(out, /migrate-layout/, "init points legacy projects at migrate-layout");
  assert.ok(!existsSync(join(dir, "insightFlow")), "no insightFlow dir created for legacy projects");
  assert.ok(existsSync(join(dir, "workTasks/master.json")), "legacy tree untouched");
});
