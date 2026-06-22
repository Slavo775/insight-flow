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
  "task-git": "TASK_GIT_ROLE.md",
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

test("N168: git is separated from the shared enforcement include into task-git only", () => {
  // The task-git agent references the generated git-permission include…
  assert.ok(
    composeAgentById("task-git").includes("@AGENT_GIT.md"),
    "task-git should reference @AGENT_GIT.md",
  );
  // …while a non-git agent does not inherit any git include.
  assert.ok(
    !composeAgentById("task-implement").includes("@AGENT_GIT.md"),
    "task-implement must not reference @AGENT_GIT.md",
  );
  // The shared enforcement file no longer carries the GIT RULE block.
  const enforcement = readFileSync(resolve(repoRoot, "AGENT_ENFORCEMENT.md"), "utf-8");
  assert.ok(!enforcement.includes("GIT RULE"), "enforcement must not carry a GIT RULE section");
  assert.ok(!enforcement.includes("Branch naming"), "git conventions must not live in enforcement");
});

test("all 9 shipped roles are registered as composed agents", () => {
  assert.deepEqual(listComposedAgents().sort(), Object.keys(ROLE_FILES).sort());
});

test("registry holds shared include + section modules and role-scoped modules", () => {
  for (const id of ["security", "enforcement", "protocol"]) {
    assert.equal(MODULE_REGISTRY[id]?.kind, "include", `${id} is an include module`);
  }
  assert.equal(MODULE_REGISTRY["security"].ref, "AGENT_SECURITY.md");
  assert.equal(MODULE_REGISTRY["enforcement"].ref, "AGENT_ENFORCEMENT.md");
  // N94: the events include became the inline `actions` section module.
  assert.equal(MODULE_REGISTRY["events"], undefined, "events include module is gone");
  assert.equal(MODULE_REGISTRY["actions"]?.kind, "section");
  assert.ok(
    MODULE_REGISTRY["actions"].body.includes("<!-- taskflow:phase-markers:start -->"),
    "actions module carries the phase markers",
  );
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
    assert.ok(
      def.modules.some((m) => m === `${agentId}/identity`),
      `${agentId} has an identity module`,
    );
  }
});

test("N98: every composed agent carries the visible baseline trio in order", () => {
  for (const [id, def] of Object.entries(COMPOSED_AGENTS)) {
    for (const base of ["security", "enforcement", "protocol"]) {
      assert.ok(def.modules.includes(base), `${id} missing baseline module ${base}`);
    }
    assert.equal(
      def.modules.indexOf("security") + 1,
      def.modules.indexOf("enforcement"),
      `${id}: security sits immediately before enforcement (preserves the pre-N98 reading order)`,
    );
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
  const markers = COMPOSED_AGENTS["task-implement"].modules
    .map((id) => {
      const mod = MODULE_REGISTRY[id];
      if (mod.kind === "include") return `@${mod.ref}`;
      // N128/N142 — status-transition + handover modules render as synthetic
      // sections; several handovers collapse into one "## Handover" section.
      if (mod.kind === "status-transition") return "## Advance the flow";
      if (mod.kind === "handover") return "## Handover";
      return mod.heading ?? mod.body.split("\n")[0];
    })
    // Collapse consecutive duplicate markers (the combined handover section).
    .filter((m, i, arr) => m !== arr[i - 1]);
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
    head: {
      id: "head",
      title: "H",
      source: "builtin",
      kind: "section",
      heading: "NEVER",
      body: "- own bullet",
    },
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
    modules: [
      "task-human-review/identity",
      "enforcement",
      "minimal-diff",
      "scope-guard",
      "recorder-discipline",
      "actions",
    ],
  });
  assert.match(md, /^ROLE: Insight-Flow Human Review Recorder/);
  assert.ok(md.includes("@AGENT_ENFORCEMENT.md"));
  assert.ok(
    md.includes("Never change code unrelated to the task at hand."),
    "minimal-diff renders",
  );
  assert.ok(md.includes("Ambiguous spec → ask, do not guess."), "scope-guard renders");
  assert.ok(
    md.includes("Preserve the human's exact wording — do not rephrase or soften."),
    "recorder-discipline renders",
  );
  assert.ok(
    md.endsWith("<!-- taskflow:phase-markers:end -->\n"),
    "actions block terminates the file",
  );
});

test("N142: handover module (auto) renders a '## Handover' section that chains the slash-command", () => {
  const registry = {
    h: {
      id: "h",
      title: "H",
      source: "builtin",
      kind: "handover",
      to: "task-git",
      on: "implemented",
      mode: "auto",
    },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["h"] }, registry);
  assert.ok(md.includes("## Handover"), "renders the Handover heading");
  assert.ok(md.includes("once the task is `implemented`"), "names the trigger");
  assert.ok(md.includes("invoke `/task-git` directly"), "auto chains the next command");
  assert.ok(!md.includes("explicit human go-ahead"), "auto does not gate");
});

test("N142: handover module (gated, the default) renders a '## Handover' section that stops for go-ahead", () => {
  const registry = {
    h: {
      id: "h",
      title: "H",
      source: "builtin",
      kind: "handover",
      to: "taskmaster",
      mode: "gated",
    },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["h"] }, registry);
  assert.ok(md.includes("## Handover"), "renders the Handover heading");
  assert.ok(
    md.includes("explicit human go-ahead before invoking `/taskmaster`"),
    "gated stops for go-ahead",
  );
  assert.ok(!md.includes("once the task is"), "trigger-less handover omits the when clause");
});

test("N142/N145: several handover modules collapse into ONE '## Handover' section listing candidates", () => {
  const registry = {
    a: {
      id: "a",
      title: "A",
      source: "builtin",
      kind: "handover",
      to: "task-git",
      on: "approved",
      mode: "auto",
    },
    b: {
      id: "b",
      title: "B",
      source: "builtin",
      kind: "handover",
      to: "task-review-fix",
      on: "fix-needed",
      mode: "gated",
    },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["a", "b"] }, registry);
  assert.equal(
    md.match(/## Handover/g)?.length,
    1,
    "exactly one Handover heading for multiple handovers",
  );
  assert.ok(md.includes("pick the handover that matches your outcome"), "candidate intro");
  assert.ok(md.includes("- `task-git` once `approved` (auto)"), "auto candidate bullet");
  assert.ok(md.includes("- `task-review-fix` once `fix-needed` (gated)"), "gated candidate bullet");
});

test("N142: handover schema defaults mode to 'gated' when omitted", () => {
  const parsed = AgentModuleSchema.parse({
    id: "custom:h",
    title: "H",
    kind: "handover",
    to: "task-git",
  });
  assert.equal(parsed.mode, "gated");
});

test("N149: composeAgent merges extra (flow) handovers into one '## Handover' section", () => {
  const registry = {
    body: {
      id: "body",
      title: "B",
      source: "builtin",
      kind: "section",
      heading: "## Role",
      body: "x",
    },
    h: {
      id: "h",
      title: "H",
      source: "builtin",
      kind: "handover",
      to: "task-git",
      on: "implemented",
      mode: "auto",
    },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["body", "h"] }, registry, [
    { to: "custom:qa", on: "approved", mode: "gated" },
  ]);
  assert.equal(md.match(/## Handover/g)?.length, 1, "one merged Handover section");
  assert.ok(md.includes("`task-git`"), "agent-module handover present");
  assert.ok(md.includes("`custom:qa`"), "flow edge handover merged in");
});

test("N149: extra handovers append a '## Handover' section when the agent declares none", () => {
  const registry = {
    body: {
      id: "body",
      title: "B",
      source: "builtin",
      kind: "section",
      heading: "## Role",
      body: "x",
    },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["body"] }, registry, [
    { to: "task-git", mode: "auto" },
  ]);
  assert.ok(md.includes("## Handover"), "section appended");
  assert.ok(md.includes("invoke `/task-git` directly"), "auto wording");
});

test("N149: no extra handovers leaves composition unchanged (drift-safe)", () => {
  const registry = {
    body: {
      id: "body",
      title: "B",
      source: "builtin",
      kind: "section",
      heading: "## Role",
      body: "x",
    },
  };
  const def = { id: "x", title: "X", modules: ["body"] };
  assert.equal(composeAgent(def, registry), composeAgent(def, registry, []));
  assert.ok(!composeAgent(def, registry).includes("## Handover"));
});

test("N149 fix: flowArtifacts emits a command for a built-in handover SOURCE (rewrites its file)", async () => {
  const { flowArtifacts } = await import("../dist/index.js");
  // taskmaster is built-in (no command.install); a flow handover from it must
  // still produce a command artifact so install rewrites .claude/commands/taskmaster.md.
  const flow = {
    id: "custom:t",
    title: "T",
    agents: ["taskmaster", "task-git"],
    flow: [{ from: "taskmaster", to: "task-git", on: "ready", handover: { mode: "auto" } }],
    install: [],
    states: [],
  };
  const cmd = flowArtifacts(flow).commands.find((c) => c.name === "taskmaster");
  assert.ok(cmd, "a command is emitted for the built-in handover source");
  assert.ok(cmd.body.includes("## Handover"), "carries a Handover section");
  assert.ok(cmd.body.includes("/task-git"), "lists the flow handover target");
  assert.ok(cmd.body.endsWith("$ARGUMENTS\n"), "N153: $ARGUMENTS parity with init");
});

test("N149 fix: no command emitted for a non-source agent without command.install", async () => {
  const { flowArtifacts } = await import("../dist/index.js");
  // task-git is the TARGET (not a source) and not command-installed → no forced command.
  const flow = {
    id: "custom:t2",
    title: "T2",
    agents: ["taskmaster", "task-git"],
    flow: [{ from: "taskmaster", to: "task-git", on: "ready", handover: { mode: "auto" } }],
    install: [],
    states: [],
  };
  assert.equal(
    flowArtifacts(flow).commands.find((c) => c.name === "task-git"),
    undefined,
  );
});

test("N94: every shipped role inlines the actions block instead of including AGENT_EVENTS.md", () => {
  for (const [id, file] of Object.entries(ROLE_FILES)) {
    const committed = readFileSync(resolve(repoRoot, file), "utf-8");
    assert.ok(!committed.includes("@AGENT_EVENTS.md"), `${file} has no events include`);
    assert.ok(
      committed.includes("<!-- taskflow:phase-markers:start -->") &&
        committed.includes("<!-- taskflow:phase-markers:end -->"),
      `${file} carries the strippable actions block`,
    );
    assert.ok(COMPOSED_AGENTS[id].modules.includes("actions"), `${id} references actions`);
  }
});

test("N96: the default project installs the activity bundle; hooks are templated; no pseudo-agent", async () => {
  const { DEFAULT_PROJECT, collectProjectInstall } = await import("../dist/index.js");
  assert.equal(DEFAULT_PROJECT.id, "default");
  assert.deepEqual(DEFAULT_PROJECT.install, ["activity"]);
  assert.equal(MODULE_REGISTRY["activity"]?.kind, "bundle");
  const artifacts = collectProjectInstall(DEFAULT_PROJECT);
  assert.equal(artifacts.hooks.length, 6, "bundle expands to the six lifecycle hooks");
  for (const h of artifacts.hooks) {
    assert.ok(h.script?.content.includes("__INSIGHT_FLOW_BIN__"), "script is templated");
  }
  assert.ok(!listComposedAgents().includes("activity"), "compose-apply must not install hooks");
});

test("N96: project flow is referentially sound and triggers are real statuses", async () => {
  const {
    DEFAULT_PROJECT,
    COMPOSED_AGENTS: agents,
    ProjectSchema,
  } = await import("../dist/index.js");
  for (const a of DEFAULT_PROJECT.agents) assert.ok(agents[a], `agent ${a} exists`);
  for (const e of DEFAULT_PROJECT.flow) {
    assert.ok(DEFAULT_PROJECT.agents.includes(e.from) && DEFAULT_PROJECT.agents.includes(e.to));
  }
  // an invalid trigger fails schema validation (loud break on status renames)
  assert.throws(() =>
    ProjectSchema.parse({
      id: "x",
      title: "X",
      agents: ["task-implement"],
      flow: [{ from: "task-implement", to: "task-implement", on: "approvedd" }],
      install: [],
    }),
  );
});

test("N95: bundles expand recursively at their declared position", () => {
  const registry = {
    a: { id: "a", title: "A", source: "builtin", kind: "section", heading: "ONE", body: "1" },
    b: { id: "b", title: "B", source: "builtin", kind: "section", heading: "TWO", body: "2" },
    c: { id: "c", title: "C", source: "builtin", kind: "section", heading: "THREE", body: "3" },
    inner: { id: "inner", title: "I", source: "builtin", kind: "bundle", modules: ["b"] },
    outer: { id: "outer", title: "O", source: "builtin", kind: "bundle", modules: ["inner", "c"] },
  };
  const md = composeAgent({ id: "x", title: "X", modules: ["a", "outer"] }, registry);
  assert.equal(
    md,
    "ONE\n\n1\n\nTWO\n\n2\n\nTHREE\n\n3\n",
    "nested bundle children splice in order",
  );
});

test("N95: dedup spans bundle and direct refs (first occurrence wins)", () => {
  const registry = {
    a: { id: "a", title: "A", source: "builtin", kind: "section", heading: "ONE", body: "1" },
    bun: { id: "bun", title: "B", source: "builtin", kind: "bundle", modules: ["a"] },
  };
  // direct ref first, bundle second — and the reverse — both render once
  for (const order of [
    ["a", "bun"],
    ["bun", "a"],
  ]) {
    const md = composeAgent({ id: "x", title: "X", modules: order }, registry);
    assert.equal(md.split("ONE").length - 1, 1, `order ${order.join(",")} dedups`);
  }
});

test("N95: bundle cycles and unknown children throw with actionable messages", () => {
  const registry = {
    a: { id: "a", title: "A", source: "builtin", kind: "bundle", modules: ["b"] },
    b: { id: "b", title: "B", source: "builtin", kind: "bundle", modules: ["a"] },
    broken: { id: "broken", title: "X", source: "builtin", kind: "bundle", modules: ["ghost"] },
  };
  assert.throws(
    () => composeAgent({ id: "x", title: "X", modules: ["a"] }, registry),
    /Bundle cycle: a → b → a/,
  );
  assert.throws(
    () => composeAgent({ id: "x", title: "X", modules: ["broken"] }, registry),
    /Unknown module 'ghost'/,
  );
});

test("N95: the shipped testing bundle wraps the three siblings", () => {
  const bundle = MODULE_REGISTRY["testing"];
  assert.equal(bundle?.kind, "bundle");
  assert.deepEqual(bundle.modules, ["testing/prompt", "testing/hook", "testing/skill"]);
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
