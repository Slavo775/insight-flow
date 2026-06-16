/**
 * N133 — agents emit status via the flow. A status-transition module (N128)
 * renders into the agent's prompt as an `insight-flow advance` instruction and
 * supplies the target the command writes through the N131 setter. Shipped
 * agents carry no transition modules, so default role Markdown is unchanged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { composeAgent, composeAgentById } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

// ---- composer rendering -----------------------------------------------------

test("N133: a status-transition module renders the advance instruction", () => {
  const registry = {
    "custom:ident": {
      id: "custom:ident",
      title: "I",
      source: "builtin",
      kind: "section",
      heading: "ROLE: QA Verifier",
      body: "Verify the build.",
    },
    "custom:set-verifying": {
      id: "custom:set-verifying",
      title: "Set verifying",
      source: "builtin",
      kind: "status-transition",
      agent: "custom:qa-verifier",
      sets: "verifying",
      from: "queued",
    },
  };
  const md = composeAgent(
    { id: "custom:qa-verifier", title: "QA", modules: ["custom:ident", "custom:set-verifying"] },
    registry,
  );
  assert.match(md, /ROLE: QA Verifier/); // identity still renders
  assert.match(md, /## Advance the flow/);
  assert.match(md, /insight-flow advance --id <task-id> --agent custom:qa-verifier/);
  assert.match(md, /sets status `verifying` \(only from `queued`\)/);
});

test("N133: shipped agents carry no transition wording (default byte-parity)", () => {
  for (const id of ["task-implement", "task-review", "task-git"]) {
    assert.doesNotMatch(composeAgentById(id), /Advance the flow/);
    assert.doesNotMatch(composeAgentById(id), /insight-flow advance/);
  }
});

// ---- end-to-end: advance through a custom flow ------------------------------

function customProject() {
  const dir = mkdtempSync(join(tmpdir(), "n133-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({ workDir: "workTasks", flows: { defaultFlow: "default", byType: {} } }),
  );
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  mkdirSync(join(dir, "insightFlow/modules"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/modules/set-verifying.json"),
    JSON.stringify({
      id: "custom:set-verifying",
      title: "Set verifying",
      kind: "status-transition",
      agent: "custom:qa-verifier",
      sets: "verifying",
    }),
  );
  mkdirSync(join(dir, "insightFlow/agents"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/agents/qa-verifier.json"),
    JSON.stringify({
      id: "custom:qa-verifier",
      title: "QA Verifier",
      modules: ["custom:set-verifying"],
    }),
  );
  mkdirSync(join(dir, "insightFlow/projects"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/projects/qa.json"),
    JSON.stringify({
      id: "custom:qa",
      title: "QA",
      agents: ["custom:qa-verifier"],
      flow: [],
      install: [],
      statuses: [
        { id: "ready", title: "ready" },
        { id: "queued", title: "Queued" },
        { id: "verifying", title: "Verifying" },
        { id: "shipped", title: "Shipped", terminal: true },
      ],
    }),
  );
  return dir;
}

const cli = (dir, args) =>
  execFileSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf-8" });
const shardOf = (dir) =>
  JSON.parse(readFileSync(join(dir, "insightFlow/workTasks/tasks-N00-N09.json"), "utf-8")).tasks[0];

test("N133 e2e: advance sets the flow's custom status via the agent's transition", () => {
  const dir = customProject();
  const id = JSON.parse(cli(dir, ["create", "--title", "T", "--type", "feat", "--flow", "custom:qa"]))
    .id;
  assert.equal(shardOf(dir).flowId, "custom:qa");

  const out = JSON.parse(cli(dir, ["advance", "--id", id, "--agent", "custom:qa-verifier"]));
  assert.equal(out.status, "verifying");
  assert.equal(shardOf(dir).status, "verifying");
  // the transition was recorded in history, attributed to the agent
  assert.deepEqual(shardOf(dir).statusHistory.at(-1).status, "verifying");
  assert.equal(shardOf(dir).statusHistory.at(-1).by, "custom:qa-verifier");
});

test("N133 e2e: advance with an agent that has no transition module errors", () => {
  const dir = customProject();
  const id = JSON.parse(cli(dir, ["create", "--title", "T", "--type", "feat", "--flow", "custom:qa"]))
    .id;
  assert.throws(
    () => cli(dir, ["advance", "--id", id, "--agent", "task-implement"]),
    (err) => /No status-transition module/.test(String(err.stderr)),
  );
});
