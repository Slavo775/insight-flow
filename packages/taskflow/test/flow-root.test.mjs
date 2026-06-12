/**
 * N99 — insightFlow layout resolver. `resolveFlowRoot` prefers the consolidated
 * `insightFlow/` root and falls back to the legacy `<workDir>` + `.events`
 * layout; `getWorkDir` / `getEventsDir` route through it; project discovery
 * accepts an insightFlow-layout project with no config file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  resolveFlowRoot,
  resolveProjectRoot,
  resolveConfig,
  getWorkDir,
  getEventsDir,
} from "../dist/index.js";

const MASTER = JSON.stringify({ meta: { nextId: 0, currentTaskId: null, shards: [] } });

function project({ legacy = false, insight = false, config = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "n99-flow-root-"));
  if (config) {
    writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify({ workDir: "workTasks" }));
  }
  if (legacy) {
    mkdirSync(join(dir, "workTasks"), { recursive: true });
    writeFileSync(join(dir, "workTasks/master.json"), MASTER);
  }
  if (insight) {
    mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
    writeFileSync(join(dir, "insightFlow/workTasks/master.json"), MASTER);
  }
  return dir;
}

test("legacy-only project resolves to the legacy layout, byte-for-byte unchanged", () => {
  const dir = project({ legacy: true });
  const fr = resolveFlowRoot(dir);
  assert.equal(fr.layout, "legacy");
  assert.equal(fr.root, resolve(dir));
  assert.equal(fr.tasksDir, resolve(dir, "workTasks"));
  assert.equal(fr.eventsDir, resolve(dir, "workTasks/.events"));

  const config = resolveConfig(dir);
  assert.equal(getWorkDir(config, dir), resolve(dir, "workTasks"));
  assert.equal(getEventsDir(config, dir), resolve(dir, "workTasks/.events"));
});

test("insightFlow-only project resolves to the new layout", () => {
  const dir = project({ insight: true });
  const fr = resolveFlowRoot(dir);
  assert.equal(fr.layout, "insightFlow");
  assert.equal(fr.root, resolve(dir, "insightFlow"));
  assert.equal(fr.tasksDir, resolve(dir, "insightFlow/workTasks"));
  assert.equal(fr.eventsDir, resolve(dir, "insightFlow/events"));

  const config = resolveConfig(dir);
  assert.equal(getWorkDir(config, dir), resolve(dir, "insightFlow/workTasks"));
  assert.equal(getEventsDir(config, dir), resolve(dir, "insightFlow/events"));
});

test("both layouts present — insightFlow wins", () => {
  const dir = project({ legacy: true, insight: true });
  const fr = resolveFlowRoot(dir);
  assert.equal(fr.layout, "insightFlow");
  assert.equal(fr.tasksDir, resolve(dir, "insightFlow/workTasks"));
});

test("custom workDir is honored on the legacy fallback", () => {
  const dir = mkdtempSync(join(tmpdir(), "n99-flow-root-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify({ workDir: "tasks" }));
  mkdirSync(join(dir, "tasks"), { recursive: true });
  writeFileSync(join(dir, "tasks/master.json"), MASTER);
  const fr = resolveFlowRoot(dir, "tasks");
  assert.equal(fr.layout, "legacy");
  assert.equal(fr.tasksDir, resolve(dir, "tasks"));
  assert.equal(fr.eventsDir, resolve(dir, "tasks/.events"));
});

test("detection is per call — a migration mid-process is picked up", () => {
  const dir = project({ legacy: true });
  assert.equal(resolveFlowRoot(dir).layout, "legacy");
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(join(dir, "insightFlow/workTasks/master.json"), MASTER);
  assert.equal(resolveFlowRoot(dir).layout, "insightFlow");
});

test("project discovery finds an insightFlow-layout project without a config file", () => {
  const dir = project({ insight: true, config: false });
  const nested = join(dir, "some/nested/dir");
  mkdirSync(nested, { recursive: true });
  assert.equal(resolveProjectRoot(nested), resolve(dir));
});
