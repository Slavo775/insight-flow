/**
 * N128 — status-transition module kind, the flow's own status set
 * (Project.statuses), and the validation tying edges/states to it. The shipped
 * default flow declares the canonical enum verbatim, so default behavior is
 * byte-identical; transition modules are LOCKED.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ProjectSchema,
  AgentModuleSchema,
  TASK_STATUSES,
  DEFAULT_PROJECT,
  loadUserRegistries,
} from "../dist/index.js";

// ---- status-transition module kind -----------------------------------------

test("N128: status-transition module validates (agent + sets, optional from)", () => {
  const ok = AgentModuleSchema.safeParse({
    id: "custom:set-implemented",
    title: "On implement → implemented",
    kind: "status-transition",
    agent: "task-implement",
    sets: "implemented",
  });
  assert.equal(ok.success, true);
  assert.equal(ok.data.source, "builtin"); // base default

  const withFrom = AgentModuleSchema.safeParse({
    id: "custom:reopen",
    title: "Reopen on fix-needed",
    kind: "status-transition",
    agent: "task-review",
    sets: "fix-needed",
    from: "reviewing",
  });
  assert.equal(withFrom.success, true);

  // required fields enforced
  assert.equal(
    AgentModuleSchema.safeParse({
      id: "custom:x",
      title: "x",
      kind: "status-transition",
      agent: "a",
    }).success,
    false,
  );
});

// ---- default flow declares the canonical status set -------------------------

test("N128: default flow's statuses == the canonical enum (ordered)", () => {
  assert.deepEqual(
    DEFAULT_PROJECT.statuses.map((s) => s.id),
    [...TASK_STATUSES],
  );
  for (const s of DEFAULT_PROJECT.statuses) assert.ok(s.title.length > 0, `${s.id} has a title`);
  const terminal = DEFAULT_PROJECT.statuses.filter((s) => s.terminal).map((s) => s.id);
  assert.deepEqual(terminal, ["merged", "done"]);
});

// ---- a flow's status set is its universe for edges/states -------------------

const baseFlow = { id: "custom:qa", title: "QA flow", agents: ["a", "b"] };

test("N128: a custom status set is the flow's universe for edge triggers", () => {
  const custom = {
    ...baseFlow,
    statuses: [
      { id: "queued", title: "Queued" },
      { id: "verifying", title: "Verifying" },
      { id: "shipped", title: "Shipped", terminal: true },
    ],
    flow: [{ from: "a", to: "b", on: "verifying" }],
  };
  assert.equal(ProjectSchema.safeParse(custom).success, true);

  // a canonical status that is NOT in this flow's set is an unknown trigger
  const bad = ProjectSchema.safeParse({
    ...custom,
    flow: [{ from: "a", to: "b", on: "implemented" }],
  });
  assert.equal(bad.success, false);
  assert.match(bad.error.issues[0].message, /unknown trigger/);
});

test("N128: empty statuses falls back to the canonical universe (back-compat)", () => {
  const legacy = { ...baseFlow, flow: [{ from: "a", to: "b", on: "implemented" }] };
  assert.equal(ProjectSchema.safeParse(legacy).success, true);
});

test("N128: duplicate status ids are rejected", () => {
  const dup = ProjectSchema.safeParse({
    ...baseFlow,
    statuses: [
      { id: "x", title: "X" },
      { id: "x", title: "X again" },
    ],
    flow: [],
  });
  assert.equal(dup.success, false);
  assert.match(dup.error.issues[0].message, /duplicate status id/);
});

test("N128: a state's mapsTo must resolve to a status of a custom-status flow", () => {
  const bad = ProjectSchema.safeParse({
    ...baseFlow,
    statuses: [{ id: "queued", title: "Queued" }],
    states: [{ id: "qa", title: "QA", mapsTo: "approved" }],
    flow: [],
  });
  assert.equal(bad.success, false);
  assert.match(bad.error.issues[0].message, /not a status of this flow/);
});

// ---- transition modules are LOCKED (kind-based) ----------------------------

function tempProject(defs = {}) {
  const dir = mkdtempSync(join(tmpdir(), "n128-statuses-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify({ workDir: "workTasks" }));
  for (const [kind, entries] of Object.entries(defs)) {
    mkdirSync(join(dir, "insightFlow", kind), { recursive: true });
    for (const [name, content] of Object.entries(entries)) {
      writeFileSync(join(dir, "insightFlow", kind, name), JSON.stringify(content, null, 2));
    }
  }
  return dir;
}

test("N128: custom status-transition module loads; a built-in-id one is locked", () => {
  const okDir = tempProject({
    modules: {
      "ship.json": {
        id: "custom:set-merged",
        title: "Ship → merged",
        kind: "status-transition",
        agent: "task-git",
        sets: "merged",
      },
    },
  });
  assert.ok(loadUserRegistries(okDir).modules["custom:set-merged"]);

  // a non-custom (would-be shipped) status-transition module cannot be defined
  // from user space — the kind is locked, like security/enforcement/protocol.
  const lockedDir = tempProject({
    modules: {
      "ship.json": {
        id: "set-merged",
        title: "Ship → merged",
        kind: "status-transition",
        agent: "task-git",
        sets: "merged",
      },
    },
  });
  assert.throws(() => loadUserRegistries(lockedDir), /locked and cannot be overridden/);
});
