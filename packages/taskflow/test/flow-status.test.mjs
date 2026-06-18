/**
 * N104 — status→node mapping derived from the flow definition (no hardcoded
 * status table). Table-driven over the shipped default project flow.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  currentFlowNodes,
  suggestNextSteps,
  edgeHandover,
  isEdgeBackedByHandover,
  classifyEdge,
} from "../dist/index.js";

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

// N144 — diagram honesty: an edge is "backed" iff its `from` agent declares a
// handover with matching `to` and `on`; otherwise it is an orphan edge.
test("edgeHandover / isEdgeBackedByHandover match on (from→to, on)", () => {
  const handovers = {
    "task-implement": [
      { to: "task-git", on: "implemented", mode: "auto" },
      { to: "task-git", on: "changes-implemented", mode: "auto" },
    ],
    "task-analyze": [{ to: "taskmaster", mode: "gated" }],
  };
  // backed: exact (to, on) match → returns the handover (with its mode)
  assert.deepEqual(
    edgeHandover({ from: "task-implement", to: "task-git", on: "implemented" }, handovers),
    {
      to: "task-git",
      on: "implemented",
      mode: "auto",
    },
  );
  assert.equal(
    isEdgeBackedByHandover(
      { from: "task-implement", to: "task-git", on: "implemented" },
      handovers,
    ),
    true,
  );
  // trigger-less handover backs a trigger-less edge
  assert.equal(isEdgeBackedByHandover({ from: "task-analyze", to: "taskmaster" }, handovers), true);
  // orphan: right agent + target but wrong trigger
  assert.equal(
    isEdgeBackedByHandover({ from: "task-implement", to: "task-git", on: "pushed" }, handovers),
    false,
  );
  // orphan: agent declares no handovers at all
  assert.equal(
    isEdgeBackedByHandover({ from: "task-git", to: "task-review", on: "pushed" }, handovers),
    false,
  );
  assert.equal(edgeHandover({ from: "task-git", to: "task-review", on: "pushed" }, {}), undefined);
});

// N146 — custom-state aliases: an edge can trigger on a flow's custom state id
// (e.g. `test-ready` mapsTo `ready`); a handover's `on` is canonical. The edge
// must resolve through `states` before matching, else it falsely orphans.
test("edgeHandover resolves custom-state aliases before matching (N146)", () => {
  const handovers = { taskmaster: [{ to: "task-implement", on: "ready", mode: "gated" }] };
  const states = [{ id: "test-ready", title: "Test ready", mapsTo: "ready" }];
  const edge = { from: "taskmaster", to: "task-implement", on: "test-ready" };
  // with states → the alias resolves to `ready` and the edge is backed
  assert.deepEqual(edgeHandover(edge, handovers, states), {
    to: "task-implement",
    on: "ready",
    mode: "gated",
  });
  assert.equal(isEdgeBackedByHandover(edge, handovers, states), true);
  // back-compat: without states the raw trigger `test-ready` !== `ready` → no match
  assert.equal(edgeHandover(edge, handovers), undefined);
  assert.equal(isEdgeBackedByHandover(edge, handovers), false);
});

// N146 — three-way classification: backed | builtin-source | orphan.
test("classifyEdge distinguishes backed, built-in-source, and orphan edges (N146)", () => {
  const handovers = {
    "custom:author": [{ to: "custom:reviewer", on: "ready", mode: "auto" }],
    taskmaster: [{ to: "task-implement", on: "ready", mode: "gated" }],
  };
  const builtins = new Set(["taskmaster", "task-implement"]);
  // backed — matching handover on a custom source
  assert.equal(
    classifyEdge({ from: "custom:author", to: "custom:reviewer", on: "ready" }, handovers, builtins)
      .backing,
    "backed",
  );
  // built-in source, unbacked target → informational, not a fixable orphan
  assert.equal(
    classifyEdge({ from: "taskmaster", to: "custom:test-agent", on: "ready" }, handovers, builtins)
      .backing,
    "builtin-source",
  );
  // custom source, no backing handover → genuine orphan
  assert.equal(
    classifyEdge({ from: "custom:author", to: "custom:other", on: "ready" }, handovers, builtins)
      .backing,
    "orphan",
  );
  // alias still resolves inside classifyEdge (built-in source + custom state)
  const states = [{ id: "test-ready", title: "Test ready", mapsTo: "ready" }];
  assert.equal(
    classifyEdge(
      { from: "taskmaster", to: "task-implement", on: "test-ready" },
      handovers,
      builtins,
      states,
    ).backing,
    "backed",
  );
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
