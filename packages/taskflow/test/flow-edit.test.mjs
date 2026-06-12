/**
 * N110 — editor edge validation (pure) + the schema's duplicate-triple
 * re-check on save.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEdgeAddition, TASK_STATUSES, ProjectSchema } from "../dist/index.js";

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
