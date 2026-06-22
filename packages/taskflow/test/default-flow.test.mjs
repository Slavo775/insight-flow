/**
 * N167 — flow removal + default-flow override. `set-default-flow` writes
 * flows.defaultFlow so a custom flow becomes the binding default WITHOUT
 * entryAgents; clearFlowReferences resets it when a flow is removed.
 * Runs the built CLI against a temp project. Requires a prior build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clearFlowReferences } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

function project() {
  const dir = mkdtempSync(join(tmpdir(), "n167-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({ workDir: "workTasks", flows: { defaultFlow: "default", byType: {} } }),
  );
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  mkdirSync(join(dir, "insightFlow/projects"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/projects/hotfix.json"),
    JSON.stringify({
      id: "custom:hotfix",
      title: "Hotfix",
      agents: ["task-implement", "task-git"],
      flow: [{ from: "task-implement", to: "task-git", on: "ready" }],
      install: [],
    }),
  );
  return dir;
}

const cli = (dir, args) =>
  execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf-8" });
const cfg = (dir) => JSON.parse(readFileSync(join(dir, "taskflow.config.json"), "utf-8"));

test("set-default-flow makes a custom flow the binding default (no entryAgents)", () => {
  const dir = project();
  const out = JSON.parse(cli(dir, ["set-default-flow", "--flow", "custom:hotfix"]));
  assert.equal(out.defaultFlow, "custom:hotfix");
  assert.equal(cfg(dir).flows.defaultFlow, "custom:hotfix");

  // a new task with no explicit flow / entry-agent match binds to the default
  const created = JSON.parse(cli(dir, ["create", "--title", "T", "--type", "feat"]));
  assert.equal(created.flowId, "custom:hotfix");
});

test("set-default-flow rejects an unknown flow", () => {
  const dir = project();
  assert.throws(() => cli(dir, ["set-default-flow", "--flow", "custom:ghost"]), /unknown flow/);
});

test("clearFlowReferences resets a default/byType that points at a removed flow", () => {
  const dir = project();
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      flows: { defaultFlow: "custom:hotfix", byType: { fix: "custom:hotfix", feat: "default" } },
    }),
  );
  const changed = clearFlowReferences("custom:hotfix", dir);
  assert.equal(changed, true);
  const flows = cfg(dir).flows;
  assert.equal(flows.defaultFlow, "default", "default reset");
  assert.equal(flows.byType.fix, undefined, "byType mapping dropped");
  assert.equal(flows.byType.feat, "default", "unrelated mapping kept");
});

test("N173: create --by an entry agent binds that flow; a non-entry --by stays default", () => {
  const dir = project();
  writeFileSync(
    join(dir, "insightFlow/projects/hotfix.json"),
    JSON.stringify({
      id: "custom:hotfix",
      title: "Hotfix",
      agents: ["task-implement", "task-git"],
      entryAgents: ["task-implement"],
      flow: [],
      install: [],
    }),
  );
  // --by the flow's entry agent binds it (and attributes the ready status)
  const a = JSON.parse(cli(dir, ["create", "--title", "T", "--type", "feat", "--by", "task-implement"]));
  assert.equal(a.flowId, "custom:hotfix");
  // --by a non-entry agent is attribution only → stays default
  const b = JSON.parse(cli(dir, ["create", "--title", "T2", "--by", "task-git"]));
  assert.equal(b.flowId, "default");
});
