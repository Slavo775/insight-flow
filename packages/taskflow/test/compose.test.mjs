/**
 * N88 — agent-module composer spike.
 * Validates the "core + stacked modules" model: schema-valid data, two
 * contribution kinds (prompt + include), reuse of shared modules across two
 * agents, merge vs module-only sections, dedup, and semantic reproduction of
 * the hand-written role files. Requires a prior build (imports from dist).
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
  for (const id of ["minimal-diff", "scope-guard", "enforcement", "protocol"]) {
    assert.ok(MODULE_REGISTRY[id], `${id} module present`);
  }
  // include-modules carry a verbatim ref; prompt-modules carry bullets
  assert.equal(MODULE_REGISTRY["enforcement"].contribution.kind, "include");
  assert.equal(MODULE_REGISTRY["enforcement"].contribution.ref, "AGENT_ENFORCEMENT.md");
  assert.equal(MODULE_REGISTRY["protocol"].contribution.ref, "AGENT_PROTOCOL.md");
  assert.equal(MODULE_REGISTRY["minimal-diff"].contribution.kind, "prompt");
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
  assert.ok(md.includes('Never implement items listed under TASK.md "Out of scope".'));
  assert.ok(md.includes("Never refactor"), "minimal-diff module merged into NEVER");
  assert.ok(md.includes("Ambiguous spec → ask, do not guess."), "scope-guard merged into SCOPE GUARD");
});

test("@includes now come from include-modules, not the literal includes array", () => {
  // both shared includes were migrated to modules; the literal `includes` is empty
  assert.deepEqual(COMPOSED_AGENTS["task-implement"].includes, []);
  assert.deepEqual(COMPOSED_AGENTS["task-review-fix"].includes, []);
  for (const id of ["task-implement", "task-review-fix"]) {
    const md = composeAgentById(id);
    assert.ok(md.includes("@AGENT_ENFORCEMENT.md"), `${id} missing enforcement include`);
    assert.ok(md.includes("@AGENT_PROTOCOL.md"), `${id} missing protocol include`);
    assert.equal(md.split("@AGENT_ENFORCEMENT.md").length - 1, 1, "include ref appears once");
  }
});

test("include-module refs are deduped", () => {
  const def = { ...COMPOSED_AGENTS["task-implement"], modules: ["enforcement", "enforcement", "protocol"] };
  const md = composeAgent(def);
  assert.equal(md.split("@AGENT_ENFORCEMENT.md").length - 1, 1, "enforcement ref deduped");
  assert.equal(md.split("@AGENT_PROTOCOL.md").length - 1, 1);
});

test("both agents reuse the same shared prompt-modules", () => {
  const sharedNever = MODULE_REGISTRY["minimal-diff"].contribution.bullets[0];
  const sharedScope = MODULE_REGISTRY["scope-guard"].contribution.bullets[0];
  for (const id of ["task-implement", "task-review-fix"]) {
    const md = composeAgentById(id);
    assert.ok(md.includes(sharedNever), `${id} missing shared minimal-diff bullet`);
    assert.ok(md.includes(sharedScope), `${id} missing shared scope-guard bullet`);
  }
});

test("prompt-module fills a reserved empty section (fixer NEVER is module-only)", () => {
  const md = composeAgentById("task-review-fix");
  assert.ok(md.includes("NEVER"), "NEVER heading present");
  assert.ok(md.includes(MODULE_REGISTRY["minimal-diff"].contribution.bullets[1]));
});

test("duplicate prompt-module refs are deduped", () => {
  const def = {
    ...COMPOSED_AGENTS["task-implement"],
    modules: ["minimal-diff", "minimal-diff", "scope-guard"],
  };
  const md = composeAgent(def);
  const needle = MODULE_REGISTRY["minimal-diff"].contribution.bullets[0];
  assert.equal(md.split(needle).length - 1, 1, "deduped module bullet should appear exactly once");
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
