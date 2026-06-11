/**
 * N90 — agent-module composer (JSON canonical).
 * The 9 committed *_ROLE.md files are generated from the JSON module registry;
 * the headline test asserts byte-equality between composer output and each
 * committed file (drift guard: hand-editing MD or editing JSON without
 * re-running `prompt-build --compose --apply` fails CI). Structural tests
 * cover the v3 renderer rules. Requires a prior build (imports from dist).
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
  "task-analyze": "TASK_ANALYZER_ROLE.md",
  taskmaster: "TASKMASTER_ROLE.md",
  "taskmaster-change": "TASKMASTER_CHANGE_ROLE.md",
  "task-implement": "TASK_IMPLEMENTER_ROLE.md",
  "task-review": "TASK_REVIEWER_ROLE.md",
  "task-review-fix": "TASK_REVIEW_FIXER_ROLE.md",
  "task-human-review": "TASK_HUMAN_REVIEW_ROLE.md",
  "task-incident": "TASK_INCIDENT_ROLE.md",
  "task-request-changes": "TASK_REQUEST_CHANGES_ROLE.md",
};

test("drift guard: composer output is byte-identical to every committed role file", () => {
  for (const [id, file] of Object.entries(ROLE_FILES)) {
    const composed = composeAgentById(id);
    const committed = readFileSync(resolve(repoRoot, file), "utf-8");
    assert.equal(
      composed,
      committed,
      `${file} differs from composeAgentById("${id}") — run \`prompt-build --compose --apply\` (JSON edited) or revert the hand-edit (MD edited)`,
    );
  }
});

test("all 9 shipped roles are registered as composed agents", () => {
  assert.deepEqual(listComposedAgents().sort(), Object.keys(ROLE_FILES).sort());
});

test("registry holds shared include + section modules and role-scoped modules", () => {
  for (const id of ["enforcement", "protocol", "events"]) {
    assert.equal(MODULE_REGISTRY[id]?.kind, "include", `${id} is an include module`);
  }
  assert.equal(MODULE_REGISTRY["enforcement"].ref, "AGENT_ENFORCEMENT.md");
  assert.equal(MODULE_REGISTRY["events"].ref, "AGENT_EVENTS.md");
  // shared section modules stay registered for future/custom composition
  for (const id of ["minimal-diff", "scope-guard", "recorder-discipline"]) {
    assert.equal(MODULE_REGISTRY[id]?.kind, "section", `${id} is a section module`);
  }
  // every composed agent resolves entirely against the registry, namespaced <role>/<slug>
  for (const [agentId, def] of Object.entries(COMPOSED_AGENTS)) {
    for (const modId of def.modules) {
      assert.ok(MODULE_REGISTRY[modId], `${agentId} references unknown module ${modId}`);
      if (modId.includes("/")) {
        assert.ok(modId.startsWith(`${agentId}/`), `${modId} is scoped to a different role`);
      }
    }
    assert.ok(def.modules.some((m) => m === `${agentId}/identity`), `${agentId} has an identity module`);
  }
});

test("composed agents are a single ordered modules list (no v1 fields)", () => {
  for (const def of Object.values(COMPOSED_AGENTS)) {
    assert.ok(Array.isArray(def.modules) && def.modules.length > 0);
    assert.equal(def.sections, undefined, "v1 sections field gone");
    assert.equal(def.includes, undefined, "v1 includes field gone");
    assert.equal(def.trailingIncludes, undefined, "v1 trailingIncludes field gone");
  }
});

test("pure sequence: blocks render in declared order", () => {
  const md = composeAgentById("task-implement");
  const markers = COMPOSED_AGENTS["task-implement"].modules.map((id) => {
    const mod = MODULE_REGISTRY[id];
    return mod.kind === "include" ? `@${mod.ref}` : (mod.heading ?? mod.body.split("\n")[0]);
  });
  let pos = -1;
  for (const marker of markers) {
    const next = md.indexOf(marker, pos + 1);
    assert.ok(next > pos, `marker "${marker}" out of declared order`);
    pos = next;
  }
});

test("consecutive include modules render adjacent, like hand-written roles", () => {
  const md = composeAgentById("task-implement");
  assert.ok(md.includes("@AGENT_ENFORCEMENT.md\n@AGENT_PROTOCOL.md"), "includes grouped");
});

test("shared discipline modules are each referenced by ≥2 composed agents (N91)", () => {
  for (const shared of ["minimal-diff", "scope-guard", "recorder-discipline"]) {
    const referents = Object.values(COMPOSED_AGENTS).filter((d) => d.modules.includes(shared));
    assert.ok(
      referents.length >= 2,
      `${shared} referenced by ${referents.length} agents — wording unification regressed`,
    );
  }
});

test("heading-only section module opens its section with a blank line before the shared body", () => {
  const registry = {
    head: { id: "head", title: "H", source: "builtin", kind: "section", heading: "NEVER" },
    cont: { id: "cont", title: "C", source: "builtin", kind: "section", body: "- shared bullet" },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["head", "cont"] }, registry);
  assert.equal(md, "NEVER\n\n- shared bullet\n");
});

test("continuation rule: body-only section module joins the previous section without a blank line", () => {
  const registry = {
    head: { id: "head", title: "H", source: "builtin", kind: "section", heading: "NEVER", body: "- own bullet" },
    cont: { id: "cont", title: "C", source: "builtin", kind: "section", body: "- shared bullet" },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["head", "cont"] }, registry);
  assert.equal(md, "NEVER\n\n- own bullet\n- shared bullet\n");
});

test("bodies render exactly: trailing newline in a body encodes an extra blank line", () => {
  const registry = {
    a: { id: "a", title: "A", source: "builtin", kind: "section", heading: "ONE", body: "x\n" },
    b: { id: "b", title: "B", source: "builtin", kind: "section", heading: "TWO", body: "y" },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["a", "b"] }, registry);
  assert.equal(md, "ONE\n\nx\n\n\nTWO\n\ny\n", "double blank line preserved");
});

test("shared section modules compose a custom agent against the real registry", () => {
  // minimal-diff / scope-guard / recorder-discipline have no shipped referents
  // since the byte-exact migration; this keeps them exercised as composable units.
  const md = composeAgent({
    id: "custom-recorder",
    title: "Custom Recorder",
    modules: ["task-human-review/identity", "enforcement", "minimal-diff", "scope-guard", "recorder-discipline", "events"],
  });
  assert.match(md, /^ROLE: Insight-Flow Human Review Recorder/);
  assert.ok(md.includes("@AGENT_ENFORCEMENT.md"));
  assert.ok(md.includes("Never change code unrelated to the task at hand."), "minimal-diff renders");
  assert.ok(md.includes("Ambiguous spec → ask, do not guess."), "scope-guard renders");
  assert.ok(md.includes("Preserve the human's exact wording — do not rephrase or soften."), "recorder-discipline renders");
  assert.ok(md.endsWith("@AGENT_EVENTS.md\n"));
});

test("repeated module refs are deduped (first occurrence wins)", () => {
  const def = {
    ...COMPOSED_AGENTS["task-implement"],
    modules: [...COMPOSED_AGENTS["task-implement"].modules, "task-implement/never", "enforcement"],
  };
  const md = composeAgent(def);
  assert.equal(md, composeAgentById("task-implement"), "duplicates change nothing");
});

test("unknown module ref and unknown agent throw", () => {
  const def = { ...COMPOSED_AGENTS["task-implement"], modules: ["does-not-exist"] };
  assert.throws(() => composeAgent(def), /Unknown module 'does-not-exist'/);
  assert.throws(() => composeAgentById("nope"), /Unknown composed agent 'nope'/);
});

test("indexById throws on duplicate id instead of silently last-winning", () => {
  const a = { id: "dup", title: "A", kind: "include", ref: "A.md" };
  const b = { id: "dup", title: "B", kind: "include", ref: "B.md" };
  assert.throws(() => indexById([a, b], AgentModuleSchema), /Duplicate id 'dup'/);
});

test("section module without heading or body is rejected by the schema", () => {
  assert.throws(() => AgentModuleSchema.parse({ id: "x", title: "X", kind: "section" }));
  AgentModuleSchema.parse({ id: "x", title: "X", kind: "section", heading: "NEVER" });
  AgentModuleSchema.parse({ id: "y", title: "Y", kind: "section", body: "- bullet" });
});
