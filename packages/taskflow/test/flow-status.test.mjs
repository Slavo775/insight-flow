/**
 * N104 — status→node mapping derived from the flow definition (no hardcoded
 * status table). Table-driven over the shipped default project flow.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { currentFlowNodes, suggestNextSteps } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const defaultProject = JSON.parse(
  readFileSync(resolve(here, "../src/agents/project/default.json"), "utf-8"),
);

const CASES = {
  // trigger statuses → producing agent(s)
  ready: ["taskmaster", "taskmaster-change"],
  implemented: ["task-implement"],
  pushed: ["task-git"],
  approved: ["task-review", "task-human-review"],
  "fix-needed": ["task-review", "task-human-review"],
  fixed: ["task-review-fix"],
  "changes-requested": ["task-request-changes"],
  "changes-implemented": ["task-implement"],
  done: ["task-human-review"],
  // working / terminal statuses → no flow position (graceful degradation)
  "in-progress": [],
  reviewing: [],
  fixing: [],
  "changes-implementing": [],
  merged: [],
};

test("currentFlowNodes maps every canonical status per the default flow", () => {
  for (const [status, expected] of Object.entries(CASES)) {
    assert.deepEqual(currentFlowNodes(defaultProject.flow, status), expected, `status "${status}"`);
  }
});

// N105 — suggested next agents per status (targets of the same trigger edges).
// Multi-branch cases are the point: approved fans out to human-review AND git.
const SUGGESTION_CASES = {
  ready: ["task-implement"], // two producer edges, same target — deduped
  implemented: ["task-git"],
  pushed: ["task-review"],
  approved: ["task-human-review", "task-git"],
  "fix-needed": ["task-review-fix"],
  fixed: ["task-review"],
  done: ["task-request-changes"],
  "changes-requested": ["task-implement"],
  "changes-implemented": ["task-git"],
  // working / terminal — no suggestions (UI shows the terminal note)
  "in-progress": [],
  reviewing: [],
  fixing: [],
  merged: [],
};

test("suggestNextSteps maps every canonical status per the default flow", () => {
  for (const [status, expected] of Object.entries(SUGGESTION_CASES)) {
    assert.deepEqual(
      suggestNextSteps(defaultProject.flow, status).map((s) => s.agentId),
      expected,
      `status "${status}"`,
    );
  }
});

test("suggestNextSteps carries the trigger and dedupes targets", () => {
  const flow = [
    { from: "a", to: "b", on: "s" },
    { from: "c", to: "b", on: "s" },
    { from: "a", to: "d", on: "s" },
    { from: "x", to: "y" },
  ];
  assert.deepEqual(suggestNextSteps(flow, "s"), [
    { agentId: "b", on: "s", label: "s" },
    { agentId: "d", on: "s", label: "s" },
  ]);
  assert.deepEqual(suggestNextSteps(flow, "zzz"), []);
});

test("currentFlowNodes dedupes producers and preserves flow order", () => {
  const flow = [
    { from: "a", to: "b", on: "s" },
    { from: "a", to: "c", on: "s" },
    { from: "d", to: "b", on: "s" },
    { from: "x", to: "y" },
  ];
  assert.deepEqual(currentFlowNodes(flow, "s"), ["a", "d"]);
  assert.deepEqual(currentFlowNodes(flow, "missing"), []);
});

// N112 — alias resolution: a custom state maps onto a canonical status; the
// map and the suggestions honor it while canonical-only flows are unaffected.
test("custom states alias onto canonical statuses end-to-end", () => {
  const states = [{ id: "qa-verify", title: "QA Verify", color: "#a78bfa", mapsTo: "approved" }];
  const flow = [
    { from: "task-review", to: "task-human-review", on: "qa-verify" },
    { from: "task-review", to: "task-review-fix", on: "fix-needed" },
  ];
  // an approved task is "at" the producer of the aliased edge…
  assert.deepEqual(currentFlowNodes(flow, "approved", states), ["task-review"]);
  // …and the suggestion carries the custom title as its label.
  assert.deepEqual(suggestNextSteps(flow, "approved", states), [
    { agentId: "task-human-review", on: "qa-verify", label: "QA Verify" },
  ]);
  // without the states list the alias is just an unknown trigger — no match.
  assert.deepEqual(currentFlowNodes(flow, "approved"), []);
  // canonical triggers resolve to themselves regardless.
  assert.deepEqual(suggestNextSteps(flow, "fix-needed", states), [
    { agentId: "task-review-fix", on: "fix-needed", label: "fix-needed" },
  ]);
});
