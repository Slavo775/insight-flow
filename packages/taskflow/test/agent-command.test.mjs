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
  deriveCommandName,
  RESERVED_COMMAND_NAMES,
  ComposedAgentSchema,
  flowInstallPlan,
} from "../dist/index.js";

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
  assert.equal(a.commands[0].body, composeAgent(AGENT));
  assert.equal(collectArtifacts({ ...AGENT, command: undefined }).commands.length, 0);
});

test("skill target wraps the composed prompt in SKILL.md frontmatter", () => {
  const a = collectArtifacts({ ...AGENT, command: { install: true, as: "skill" } });
  assert.equal(a.commands[0].as, "skill");
  assert.match(
    a.commands[0].body,
    /^---\nname: task-web-tester\ndescription: Drives chrome\n---\n/,
  );
});

test("applyArtifacts installs the command, is idempotent, and removes it on opt-out", () => {
  const dir = tmp();
  applyArtifacts(collectArtifacts(AGENT), dir, AGENT.id);
  const cmdPath = join(dir, ".claude/commands/task-web-tester.md");
  assert.ok(existsSync(cmdPath), "command file written");
  assert.equal(readFileSync(cmdPath, "utf-8"), composeAgent(AGENT));

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

test("a command name claimed by another agent throws instead of overwriting", () => {
  const dir = tmp();
  applyArtifacts(collectArtifacts(AGENT), dir, AGENT.id);
  // a different agent id that derives the SAME command name
  const dup = {
    id: "custom:task-web-tester",
    title: "Dup",
    modules: ["testing/prompt"],
    command: { install: true, as: "command" },
  };
  assert.equal(deriveCommandName(dup.id), "task-web-tester");
  assert.throws(
    () => applyArtifacts(collectArtifacts(dup), dir, dup.id),
    /already managed by agent 'custom:web-tester'/,
  );
});

test("flowInstallPlan still builds the default flow's steps (new command loop is harmless)", async () => {
  const { DEFAULT_PROJECT } = await import("../dist/index.js");
  const plan = flowInstallPlan(DEFAULT_PROJECT);
  assert.ok(Array.isArray(plan) && plan.length > 0);
  assert.ok(plan.every((s) => ["mcp", "hook", "skill", "command"].includes(s.kind)));
});
