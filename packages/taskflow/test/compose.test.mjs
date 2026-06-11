/**
 * N89 — agent-module composer v2 ("everything is a module").
 * Validates the unified model: one ordered `modules` list per agent, section +
 * include module kinds, pure-sequence rendering, registry namespacing,
 * duplicate-id guard, and normalized section-set reproduction of the
 * hand-written role files. Requires a prior build (imports from dist).
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
  indexById,
  AgentModuleSchema,
  MODULE_REGISTRY,
  COMPOSED_AGENTS,
} from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../.."); // packages/taskflow/test → repo root

const ROLE_FILES = {
  "task-implement": "TASK_IMPLEMENTER_ROLE.md",
  "task-review-fix": "TASK_REVIEW_FIXER_ROLE.md",
};

// ALL-CAPS heading lines ("INPUT CONTRACT", "ROLE-SPECIFIC OVERRIDES", …);
// excludes the "ROLE: …" identity line and @include lines.
function headingSequence(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[A-Z][A-Z -]+$/.test(l) && l.length > 2);
}

function includeSequence(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("@"));
}

test("registry holds shared + role-scoped modules with the right kinds", () => {
  for (const id of ["enforcement", "protocol", "events"]) {
    assert.equal(MODULE_REGISTRY[id]?.kind, "include", `${id} is an include module`);
  }
  for (const id of ["minimal-diff", "scope-guard", "recorder-discipline"]) {
    assert.equal(MODULE_REGISTRY[id]?.kind, "section", `${id} is a section module`);
  }
  assert.equal(MODULE_REGISTRY["enforcement"].ref, "AGENT_ENFORCEMENT.md");
  assert.equal(MODULE_REGISTRY["events"].ref, "AGENT_EVENTS.md");
  // role-scoped modules are namespaced <role>/<slug>
  for (const role of Object.keys(ROLE_FILES)) {
    for (const slug of ["identity", "input-contract", "output-contract", "overrides", "never", "scope-guard"]) {
      assert.ok(MODULE_REGISTRY[`${role}/${slug}`], `missing ${role}/${slug}`);
    }
  }
  assert.deepEqual(listComposedAgents().sort(), ["task-implement", "task-review-fix"]);
});

test("composed agents are a single ordered modules list (no sections/includes fields)", () => {
  for (const id of Object.keys(ROLE_FILES)) {
    const def = COMPOSED_AGENTS[id];
    assert.ok(Array.isArray(def.modules) && def.modules.length > 0);
    assert.equal(def.sections, undefined, "v1 sections field gone");
    assert.equal(def.includes, undefined, "v1 includes field gone");
    assert.equal(def.trailingIncludes, undefined, "v1 trailingIncludes field gone");
  }
});

test("normalized section-set reproduction: heading sequence matches the hand-written role", () => {
  for (const [id, file] of Object.entries(ROLE_FILES)) {
    const md = composeAgentById(id);
    const role = readFileSync(resolve(repoRoot, file), "utf-8");
    assert.deepEqual(
      headingSequence(md),
      headingSequence(role),
      `${id}: composed headings must match ${file} in set and order`,
    );
  }
});

test("include sequence matches the hand-written role (enforcement/protocol top, events trailing)", () => {
  for (const [id, file] of Object.entries(ROLE_FILES)) {
    const md = composeAgentById(id);
    const role = readFileSync(resolve(repoRoot, file), "utf-8");
    assert.deepEqual(includeSequence(md), includeSequence(role), `${id}: include lines`);
    assert.equal(md.split("@AGENT_ENFORCEMENT.md").length - 1, 1, "include ref appears once");
  }
});

test("no dropped role-specific content (distinctive phrases per section)", () => {
  const phrasesByAgent = {
    "task-implement": [
      "ROLE: Insight-Flow Task Implementer",
      "Follow the spec exactly — no creative decisions, no scope expansion.",
      "Mode detection: `ready`/`in-progress` → full",
      "Code changes satisfying every CHECKLIST item",
      "implement-start --id Nxx",
      "Self-verify each CHECKLIST item",
      'Never implement items listed under TASK.md "Out of scope".',
      "Full mode: if implementation requires changes to >2 files",
    ],
    "task-review-fix": [
      "ROLE: Insight-Flow Task Review Fixer",
      "apply targeted fixes for every blocker",
      "insight-flow next-fix",
      "Code changes addressing every blocker.",
      "fix-start --id Nxx",
      "Only fix what the review explicitly flagged as a blocker.",
    ],
  };
  for (const [id, phrases] of Object.entries(phrasesByAgent)) {
    const md = composeAgentById(id);
    const role = readFileSync(resolve(repoRoot, ROLE_FILES[id]), "utf-8");
    for (const phrase of phrases) {
      assert.ok(role.includes(phrase), `precondition: ${ROLE_FILES[id]} contains "${phrase}"`);
      assert.ok(md.includes(phrase), `${id} composed output missing "${phrase}"`);
    }
  }
});

test("both agents reuse the same shared section modules", () => {
  const sharedNever = "Never change code unrelated to the task at hand.";
  const sharedScope = "Ambiguous spec → ask, do not guess.";
  for (const id of Object.keys(ROLE_FILES)) {
    const md = composeAgentById(id);
    assert.ok(md.includes(sharedNever), `${id} missing shared minimal-diff bullet`);
    assert.ok(md.includes(sharedScope), `${id} missing shared scope-guard bullet`);
  }
});

test("pure sequence: blocks render in declared order", () => {
  const md = composeAgentById("task-implement");
  const order = COMPOSED_AGENTS["task-implement"].modules.map((id) => {
    const mod = MODULE_REGISTRY[id];
    return mod.kind === "include" ? `@${mod.ref}` : (mod.heading ?? mod.body.split("\n")[0]);
  });
  let pos = -1;
  for (const marker of order) {
    const next = md.indexOf(marker, pos + 1);
    assert.ok(next > pos, `marker "${marker}" out of declared order`);
    pos = next;
  }
});

test("heading-only module opens a section that the next body-only module continues", () => {
  const md = composeAgentById("task-review-fix");
  // fixer NEVER is heading-only; minimal-diff bullets follow directly after it
  assert.match(md, /NEVER\n\n- Never change code unrelated to the task at hand\./);
});

test("consecutive include modules render adjacent, like hand-written roles", () => {
  const md = composeAgentById("task-implement");
  assert.ok(md.includes("@AGENT_ENFORCEMENT.md\n@AGENT_PROTOCOL.md"), "includes grouped");
});

test("repeated module refs are deduped (first occurrence wins)", () => {
  const def = {
    ...COMPOSED_AGENTS["task-implement"],
    modules: [...COMPOSED_AGENTS["task-implement"].modules, "minimal-diff", "enforcement"],
  };
  const md = composeAgent(def);
  assert.equal(md.split("Never change code unrelated to the task at hand.").length - 1, 1);
  assert.equal(md.split("@AGENT_ENFORCEMENT.md").length - 1, 1);
});

test("unknown module ref throws before any output", () => {
  const def = { ...COMPOSED_AGENTS["task-implement"], modules: ["does-not-exist"] };
  assert.throws(() => composeAgent(def), /Unknown module 'does-not-exist'/);
});

test("indexById throws on duplicate id instead of silently last-winning", () => {
  const a = { id: "dup", title: "A", kind: "include", ref: "A.md" };
  const b = { id: "dup", title: "B", kind: "include", ref: "B.md" };
  assert.throws(() => indexById([a, b], AgentModuleSchema), /Duplicate id 'dup'/);
});

test("section module without heading or body is rejected by the schema", () => {
  assert.throws(() => AgentModuleSchema.parse({ id: "x", title: "X", kind: "section" }));
  // heading-only and body-only are both valid
  AgentModuleSchema.parse({ id: "x", title: "X", kind: "section", heading: "NEVER" });
  AgentModuleSchema.parse({ id: "y", title: "Y", kind: "section", body: "- bullet" });
});
