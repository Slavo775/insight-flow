/**
 * N110 — editor edge validation (pure) + the schema's duplicate-triple
 * re-check on save.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateEdgeAddition,
  TASK_STATUSES,
  ProjectSchema,
  AgentModuleSchema,
} from "../dist/index.js";

const EDGES = [
  { from: "a", to: "b", on: "ready" },
  { from: "a", to: "c" },
];

test("validateEdgeAddition: table-driven rules", () => {
  const cases = [
    { candidate: { from: "x", to: "x", on: "ready" }, expect: /self-loops/ },
    { candidate: { from: "a", to: "b", on: "ready" }, expect: /duplicate edge/ },
    { candidate: { from: "a", to: "c" }, expect: /duplicate edge/ },
    { candidate: { from: "a", to: "b", on: "fixed" }, expect: null }, // same pair, new trigger
    { candidate: { from: "b", to: "a", on: "ready" }, expect: null }, // reverse direction
    { candidate: { from: "a", to: "c", on: "ready" }, expect: null }, // handoff → triggered
  ];
  for (const { candidate, expect } of cases) {
    const result = validateEdgeAddition(EDGES, candidate);
    if (expect === null) assert.equal(result, null, JSON.stringify(candidate));
    else assert.match(result ?? "", expect, JSON.stringify(candidate));
  }
});

test("TASK_STATUSES is the schema's trigger source of truth", () => {
  const project = {
    id: "custom:t",
    title: "T",
    agents: ["a", "b"],
    flow: [{ from: "a", to: "b", on: "approvedd" }],
    install: [],
  };
  assert.equal(ProjectSchema.safeParse(project).success, false, "typo trigger rejected");
  for (const status of TASK_STATUSES) {
    const ok = ProjectSchema.safeParse({ ...project, flow: [{ from: "a", to: "b", on: status }] });
    assert.equal(ok.success, true, status);
  }
});

test("ProjectSchema rejects duplicate (from,to,on) triples on save", () => {
  const project = {
    id: "custom:t",
    title: "T",
    agents: ["a", "b"],
    flow: [
      { from: "a", to: "b", on: "ready" },
      { from: "a", to: "b", on: "ready" },
    ],
    install: [],
  };
  const result = ProjectSchema.safeParse(project);
  assert.equal(result.success, false);
  assert.match(result.error.issues[0].message, /duplicate flow edge/);
});

// N112 — schema: states validated, custom triggers legal only when defined.
test("ProjectSchema states: duplicates, canonical shadowing, unknown mapsTo, trigger legality", () => {
  const base = { id: "custom:s", title: "S", agents: ["a", "b"], install: [] };
  const qa = { id: "qa-verify", title: "QA", mapsTo: "approved" };

  // happy: custom trigger defined by this flow
  assert.equal(
    ProjectSchema.safeParse({
      ...base,
      states: [qa],
      flow: [{ from: "a", to: "b", on: "qa-verify" }],
    }).success,
    true,
  );
  // custom trigger NOT defined → rejected
  const undef = ProjectSchema.safeParse({
    ...base,
    states: [],
    flow: [{ from: "a", to: "b", on: "qa-verify" }],
  });
  assert.equal(undef.success, false);
  assert.match(undef.error.issues[0].message, /unknown trigger/);
  // duplicate state ids
  assert.equal(
    ProjectSchema.safeParse({ ...base, states: [qa, { ...qa, title: "Other" }], flow: [] }).success,
    false,
  );
  // shadowing a canonical status
  assert.equal(
    ProjectSchema.safeParse({
      ...base,
      states: [{ id: "approved", title: "X", mapsTo: "approved" }],
      flow: [],
    }).success,
    false,
  );
  // unknown mapsTo
  assert.equal(
    ProjectSchema.safeParse({
      ...base,
      states: [{ id: "qa", title: "X", mapsTo: "approvedd" }],
      flow: [],
    }).success,
    false,
  );
});

// Review-fix — schema rejects custom ids that aren't filename-safe slugs.
test("DefinitionIdSchema constrains custom ids but leaves built-ins alone", () => {
  const ok = { id: "custom:my-flow", title: "T", agents: ["a", "b"], flow: [], install: [] };
  assert.equal(ProjectSchema.safeParse(ok).success, true);
  for (const bad of ["custom:My-Flow", "custom:a b", "custom:a/b", "custom:-lead", "custom:"]) {
    assert.equal(ProjectSchema.safeParse({ ...ok, id: bad }).success, false, bad);
  }
  // built-in-style ids (no custom: prefix) are unconstrained — the shipped
  // default project id and slashed module ids must still validate.
  assert.equal(ProjectSchema.safeParse({ ...ok, id: "default" }).success, true);
  assert.equal(
    AgentModuleSchema.safeParse({
      id: "task-implement/input-contract",
      title: "T",
      kind: "section",
      body: "x",
    }).success,
    true,
  );
});

// N115 — changing an edge's trigger validates as remove-old + add-new: the
// edge being edited is excluded, so re-picking its own trigger is fine but a
// trigger that duplicates a sibling's (from,to,on) is rejected.
test("edge trigger change validates against the other edges", () => {
  const flow = [
    { from: "a", to: "b", on: "implemented" },
    { from: "a", to: "b", on: "fixed" },
  ];
  const others = flow.filter((_, i) => i !== 0); // editing edge[0]
  assert.match(validateEdgeAddition(others, { from: "a", to: "b", on: "fixed" }), /duplicate/);
  assert.equal(validateEdgeAddition(others, { from: "a", to: "b", on: "approved" }), null);
  assert.equal(validateEdgeAddition(others, { from: "a", to: "b", on: "implemented" }), null);
});
