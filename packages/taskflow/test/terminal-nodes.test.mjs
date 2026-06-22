/**
 * N166 — terminal "done" nodes. A flow edge's target may be an agent OR a
 * declared terminal status (a status flagged `terminal`), so an agent can point
 * at a terminal outcome. Covers the relaxed referential validation. Requires a
 * prior build (imports from dist).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReferences } from "../dist/index.js";

const user = { modules: {}, agents: {}, projects: {} };
const base = {
  id: "custom:term",
  title: "Term",
  agents: ["task-implement"],
  statuses: [{ id: "done", title: "Done", terminal: true }],
  flow: [],
  install: [],
  states: [],
  entryAgents: [],
};

test("N166: an agent → terminal-status edge passes referential validation", () => {
  const proj = { ...base, flow: [{ from: "task-implement", to: "done", on: "approved" }] };
  assert.equal(validateReferences("projects", proj, user), null);
});

test("N166: multiple terminal outcomes are allowed", () => {
  const proj = {
    ...base,
    statuses: [
      { id: "done", title: "Done", terminal: true },
      { id: "rejected", title: "Rejected", terminal: true },
    ],
    flow: [
      { from: "task-implement", to: "done", on: "approved" },
      { from: "task-implement", to: "rejected", on: "fix-needed" },
    ],
  };
  assert.equal(validateReferences("projects", proj, user), null);
});

test("N166: an edge to an unknown target (not agent, not terminal) is rejected", () => {
  const proj = { ...base, flow: [{ from: "task-implement", to: "nowhere" }] };
  assert.match(
    validateReferences("projects", proj, user),
    /undeclared agent or terminal 'nowhere'/,
  );
});

test("N166: an edge to a NON-terminal status is rejected (only terminals are end nodes)", () => {
  const proj = {
    ...base,
    statuses: [
      { id: "review", title: "Review" },
      { id: "done", title: "Done", terminal: true },
    ],
    flow: [{ from: "task-implement", to: "review" }],
  };
  assert.match(validateReferences("projects", proj, user), /undeclared agent or terminal 'review'/);
});
