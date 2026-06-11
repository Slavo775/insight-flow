/**
 * N88 — agent-module composer spike.
 * Validates the "core + stacked modules" model: schema-valid data, reuse of
 * shared modules across two agents, merge vs module-only sections, dedup, and
 * semantic reproduction of the hand-written role files. Requires a prior build
 * (tests import from ../dist/index.js).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  composeAgent,
  composeAgentById,
  listComposedAgents,
  MODULE_REGISTRY,
  COMPOSED_AGENTS,
} from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../.."); // packages/taskflow/test → repo root

test("registry + agents load and are schema-valid", () => {
  assert.ok(MODULE_REGISTRY["minimal-diff"], "minimal-diff module present");
  assert.ok(MODULE_REGISTRY["scope-guard"], "scope-guard module present");
  assert.deepEqual(listComposedAgents().sort(), ["task-implement", "task-review-fix"]);
});

test("composed task-implement reproduces role structure + merged modules", () => {
  const md = composeAgentById("task-implement");
  assert.match(md, /^ROLE: Insight-Flow Task Implementer/);
  for (const inc of ["@AGENT_ENFORCEMENT.md", "@AGENT_PROTOCOL.md", "@AGENT_EVENTS.md"]) {
    assert.ok(md.includes(inc), `missing include ${inc}`);
  }
  for (const h of [
    "INPUT CONTRACT",
    "OUTPUT CONTRACT",
    "ROLE-SPECIFIC OVERRIDES",
    "NEVER",
    "SCOPE GUARD",
  ]) {
    assert.ok(md.includes(h), `missing section ${h}`);
  }
  // role-specific bullet preserved alongside the merged shared module bullets
  assert.ok(md.includes('Never implement items listed under TASK.md "Out of scope".'));
  assert.ok(md.includes("Never refactor"), "minimal-diff module merged into NEVER");
  assert.ok(md.includes("Ambiguous spec → ask, do not guess."), "scope-guard merged into SCOPE GUARD");
});

test("both agents reuse the same shared modules (reuse proven)", () => {
  const sharedNever = MODULE_REGISTRY["minimal-diff"].contribution.bullets[0];
  const sharedScope = MODULE_REGISTRY["scope-guard"].contribution.bullets[0];
  for (const id of ["task-implement", "task-review-fix"]) {
    const md = composeAgentById(id);
    assert.ok(md.includes(sharedNever), `${id} missing shared minimal-diff bullet`);
    assert.ok(md.includes(sharedScope), `${id} missing shared scope-guard bullet`);
  }
});

test("module fills a reserved empty section (fixer NEVER is module-only)", () => {
  const md = composeAgentById("task-review-fix");
  // fixer declares NEVER with an empty body; minimal-diff supplies its content
  const neverIdx = md.indexOf("NEVER");
  assert.ok(neverIdx > -1, "NEVER heading present");
  assert.ok(md.includes(MODULE_REGISTRY["minimal-diff"].contribution.bullets[1]));
});

test("duplicate module refs are deduped", () => {
  const def = {
    ...COMPOSED_AGENTS["task-implement"],
    modules: ["minimal-diff", "minimal-diff", "scope-guard"],
  };
  const md = composeAgent(def);
  const needle = MODULE_REGISTRY["minimal-diff"].contribution.bullets[0];
  const count = md.split(needle).length - 1;
  assert.equal(count, 1, "deduped module bullet should appear exactly once");
});

test("unknown module ref throws", () => {
  const def = { ...COMPOSED_AGENTS["task-implement"], modules: ["does-not-exist"] };
  assert.throws(() => composeAgent(def), /Unknown module 'does-not-exist'/);
});

test("semantic reproduction: composed output covers the hand-written role's key content", () => {
  const md = composeAgentById("task-implement");
  const role = readFileSync(resolve(repoRoot, "TASK_IMPLEMENTER_ROLE.md"), "utf-8");
  for (const phrase of [
    "ROLE: Insight-Flow Task Implementer",
    "implement-start --id Nxx",
    "Self-verify each CHECKLIST item",
    'Never implement items listed under TASK.md "Out of scope".',
  ]) {
    assert.ok(role.includes(phrase), `precondition: role should contain "${phrase}"`);
    assert.ok(md.includes(phrase), `composed output missing "${phrase}"`);
  }
});
