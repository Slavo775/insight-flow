/**
 * N104 — status→node mapping derived from the flow definition (no hardcoded
 * status table). Table-driven over the shipped default project flow.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { currentFlowNodes } from "../dist/index.js";

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
    assert.deepEqual(
      currentFlowNodes(defaultProject.flow, status),
      expected,
      `status "${status}"`,
    );
  }
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
