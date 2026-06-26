/**
 * N138 — agent-installable command/skill on flow install.
 * Covers the name-derivation rule + reserved-collision guard, collectArtifacts
 * emitting the composed prompt as a command/skill, and applyArtifacts writing /
 * idempotently re-applying / removing it. Requires a prior build (imports dist).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectArtifacts,
  applyArtifacts,
  composeAgent,
  withFlowIdentity,
  deriveCommandName,
  RESERVED_COMMAND_NAMES,
  ComposedAgentSchema,
  flowInstallPlan,
} from "../dist/index.js";

// N173 — a command-installed agent's body is its composed prompt wrapped with the
// flow identity (stamps --by into `create` + appends the identity note).
const cmdBody = (agent) => withFlowIdentity(composeAgent(agent), agent.id);

const tmp = () => mkdtempSync(join(tmpdir(), "n138-cmd-"));

const AGENT = {
  id: "custom:web-tester",
  title: "Web tester",
  description: "Drives chrome",
  modules: ["testing/prompt"],
  command: { install: true, as: "command" },
};

test("deriveCommandName namespaces under task- without double-prefixing", () => {
  assert.equal(deriveCommandName("custom:web-tester"), "task-web-tester");
  assert.equal(deriveCommandName("custom:task-foo"), "task-foo");
  assert.equal(deriveCommandName("custom:taskmaster-x"), "taskmaster-x");
  assert.ok(RESERVED_COMMAND_NAMES.includes("task-implement"));
});

test("schema rejects a command name colliding with a built-in; allows it when not installing", () => {
  assert.throws(
    () =>
      ComposedAgentSchema.parse({
        id: "custom:implement",
        title: "I",
        modules: ["x"],
        command: { install: true, as: "command" },
      }),
    /collides with a built-in/,
  );
  // not opting in → no name check
  assert.doesNotThrow(() =>
    ComposedAgentSchema.parse({ id: "custom:implement", title: "I", modules: ["x"] }),
  );
});

test("collectArtifacts emits the composed prompt as a command (and skips when not opted in)", () => {
  const a = collectArtifacts(AGENT);
  assert.equal(a.commands.length, 1);
  assert.equal(a.commands[0].name, "task-web-tester");
  assert.equal(a.commands[0].as, "command");
  assert.equal(a.commands[0].body, cmdBody(AGENT));
  assert.match(a.commands[0].body, /--by custom:web-tester/);
  assert.equal(collectArtifacts({ ...AGENT, command: undefined }).commands.length, 0);
});

test("skill target wraps the composed prompt in SKILL.md frontmatter", () => {
  const a = collectArtifacts({ ...AGENT, command: { install: true, as: "skill" } });
  assert.equal(a.commands[0].as, "skill");
  // N153 — description is JSON-stringified (YAML-safe quoted scalar).
  assert.match(
    a.commands[0].body,
    /^---\nname: task-web-tester\ndescription: "Drives chrome"\n---\n/,
  );
});

test("N153: skill description with YAML metacharacters stays valid frontmatter", () => {
  const a = collectArtifacts({
    ...AGENT,
    description: "Drives: chrome #1 [beta]",
    command: { install: true, as: "skill" },
  });
  // the colon/hash/brackets are safely quoted, not raw
  assert.match(a.commands[0].body, /\ndescription: "Drives: chrome #1 \[beta\]"\n/);
});

test("N153: empty composed prompt → no command emitted (only non-text modules)", () => {
  const registry = {
    m: { id: "m", title: "M", source: "builtin", kind: "mcp-server", name: "x", config: {} },
  };
  const a = collectArtifacts(
    { id: "custom:empty", title: "E", modules: ["m"], command: { install: true, as: "command" } },
    registry,
  );
  assert.equal(a.commands.length, 0, "no command for an empty prompt");
  assert.equal(a.mcpServers.length, 1, "the mcp-server artifact is still collected");
});

test("N153: command-as-skill collides with a skill module of the same name", () => {
  const dir = tmp();
  // agent A contributes a skill module named "task-foo"
  applyArtifacts(
    { mcpServers: [], hooks: [], skills: [{ name: "task-foo", content: "x" }], commands: [] },
    dir,
    "agentA",
  );
  // agent B installs a command AS A SKILL deriving the same name → same .claude/skills path
  assert.throws(
    () =>
      applyArtifacts(
        {
          mcpServers: [],
          hooks: [],
          skills: [],
          commands: [{ name: "task-foo", body: "y", as: "skill" }],
        },
        dir,
        "agentB",
      ),
    /already managed by agent 'agentA'/,
  );
});

test("applyArtifacts installs the command, is idempotent, and removes it on opt-out", () => {
  const dir = tmp();
  applyArtifacts(collectArtifacts(AGENT), dir, AGENT.id);
  const cmdPath = join(dir, ".claude/commands/task-web-tester.md");
  assert.ok(existsSync(cmdPath), "command file written");
  assert.equal(readFileSync(cmdPath, "utf-8"), cmdBody(AGENT));

  const second = applyArtifacts(collectArtifacts(AGENT), dir, AGENT.id);
  assert.ok(
    second.every((r) => r.action === "unchanged"),
    JSON.stringify(second),
  );

  // opt out → the previously-managed command file is removed
  applyArtifacts(collectArtifacts({ ...AGENT, command: undefined }), dir, AGENT.id);
  assert.ok(!existsSync(cmdPath), "command removed on opt-out");
});

test("skill target writes under .claude/skills/<name>/SKILL.md", () => {
  const dir = tmp();
  applyArtifacts(
    collectArtifacts({ ...AGENT, command: { install: true, as: "skill" } }),
    dir,
    AGENT.id,
  );
  const p = join(dir, ".claude/skills/task-web-tester/SKILL.md");
  assert.ok(existsSync(p));
  assert.match(readFileSync(p, "utf-8"), /^---\nname: task-web-tester/);
});

test("a command name claimed by another agent with a DIFFERENT body throws instead of overwriting", () => {
  const dir = tmp();
  applyArtifacts(collectArtifacts(AGENT), dir, AGENT.id);
  // a different agent id that derives the SAME command name but a different prompt
  const dup = {
    id: "custom:task-web-tester",
    title: "Dup",
    modules: ["m"],
    command: { install: true, as: "command" },
  };
  const registry = {
    m: { id: "m", title: "M", kind: "section", source: "builtin", body: "a different prompt" },
  };
  assert.equal(deriveCommandName(dup.id), "task-web-tester");
  assert.notEqual(composeAgent(dup, registry), composeAgent(AGENT));
  assert.throws(
    () => applyArtifacts(collectArtifacts(dup, registry), dir, dup.id),
    /already managed by agent 'custom:web-tester' with a different definition/,
  );
});

test("N164: the SAME agent installed by a second flow is idempotent (no throw)", () => {
  const dir = tmp();
  // The same command-installed agent appears in two flows (different install
  // buckets). N173 — the identity note is keyed on the agent id, so the SAME
  // agent yields an identical body in both flows → idempotent re-claim.
  applyArtifacts(collectArtifacts(AGENT), dir, "flow-a");
  let reports;
  assert.doesNotThrow(() => {
    reports = applyArtifacts(collectArtifacts(AGENT), dir, "flow-b");
  });
  assert.ok(
    reports.some((r) => r.target.endsWith("task-web-tester.md") && r.action === "unchanged"),
    JSON.stringify(reports),
  );
});

test("N164 review-fix: a shared command survives when one owner opts out", () => {
  const dir = tmp();
  const cmdPath = join(dir, ".claude/commands/task-web-tester.md");
  // The same agent installed by two flows (different buckets).
  applyArtifacts(collectArtifacts(AGENT), dir, "flow-a");
  applyArtifacts(collectArtifacts(AGENT), dir, "flow-b");
  assert.ok(existsSync(cmdPath), "present after shared re-claim");
  // flow-a re-applied WITHOUT the command → must NOT delete it (flow-b still claims it).
  applyArtifacts(collectArtifacts({ ...AGENT, command: undefined }), dir, "flow-a");
  assert.ok(existsSync(cmdPath), "shared command survives one owner opting out");
  // Once flow-b also drops it, no claimant remains → removed.
  applyArtifacts({ mcpServers: [], hooks: [], skills: [], commands: [] }, dir, "flow-b");
  assert.ok(!existsSync(cmdPath), "removed once no agent claims it");
});

test("flowInstallPlan still builds the default flow's steps (new command loop is harmless)", async () => {
  const { DEFAULT_PROJECT } = await import("../dist/index.js");
  const plan = flowInstallPlan(DEFAULT_PROJECT);
  assert.ok(Array.isArray(plan) && plan.length > 0);
  assert.ok(plan.every((s) => ["mcp", "hook", "skill", "command", "subagent"].includes(s.kind)));
});

test("N173: withFlowIdentity stamps --by into the create invocation, not prose mentions", () => {
  const body = "Run: `insight-flow create --title X`.\nIf `insight-flow create` returns null, edit it.";
  const out = withFlowIdentity(body, "custom:tm");
  assert.match(out, /insight-flow create --by custom:tm --title X/);
  assert.match(out, /If `insight-flow create` returns null/); // prose mention untouched
  assert.match(out, /## Flow identity/);
});
