/**
 * N92 — artifact emitter for heterogeneous modules.
 * Covers collectArtifacts (order, dedup, text-kind exclusion) and
 * applyArtifacts merge rules: .mcp.json dedup-by-name + conflict error,
 * settings-hook reconciliation via the managed manifest (replace on reapply,
 * removal cleanup), skill files, and end-to-end idempotency.
 * Requires a prior build (imports from dist).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectArtifacts, applyArtifacts, MODULE_REGISTRY } from "../dist/index.js";

const tmp = () => mkdtempSync(join(tmpdir(), "n92-emit-"));
const readJson = (p) => JSON.parse(readFileSync(p, "utf-8"));

const PILOT = {
  id: "pilot",
  title: "Pilot",
  modules: ["testing/prompt", "testing/hook", "testing/skill"],
};

test("testing integration modules are registered with the right kinds", () => {
  assert.equal(MODULE_REGISTRY["testing/prompt"]?.kind, "section");
  assert.equal(MODULE_REGISTRY["testing/hook"]?.kind, "hook");
  assert.equal(MODULE_REGISTRY["testing/skill"]?.kind, "skill");
});

test("collectArtifacts gathers non-text kinds and ignores text kinds", () => {
  const a = collectArtifacts(PILOT);
  assert.equal(a.hooks.length, 1);
  assert.equal(a.hooks[0].event, "PostToolUse");
  assert.equal(a.skills.length, 1);
  assert.equal(a.skills[0].name, "taskflow-run-tests");
  assert.equal(a.mcpServers.length, 0);
  // the section module contributes to MD, not artifacts
  const textOnly = collectArtifacts({ id: "t", title: "T", modules: ["testing/prompt"] });
  assert.deepEqual(textOnly, { mcpServers: [], hooks: [], skills: [] });
});

test("collectArtifacts dedups repeated refs and throws on unknown ids", () => {
  const a = collectArtifacts({ ...PILOT, modules: [...PILOT.modules, "testing/hook"] });
  assert.equal(a.hooks.length, 1, "repeated hook ref deduped");
  assert.throws(
    () => collectArtifacts({ id: "x", title: "X", modules: ["nope"] }),
    /Unknown module 'nope'/,
  );
});

test("mcp-server merge: dedup by name, conflict on different config, key order tolerated", () => {
  const dir = tmp();
  const registry = {
    a: { id: "a", title: "A", kind: "mcp-server", source: "builtin", name: "jira", config: { url: "x", auth: "t" } },
  };
  const artifacts = collectArtifacts({ id: "p", title: "P", modules: ["a"] }, registry);
  let reports = applyArtifacts(artifacts, dir, "p");
  assert.deepEqual(reports, [{ target: ".mcp.json", action: "created" }]);
  assert.deepEqual(readJson(join(dir, ".mcp.json")).mcpServers.jira, { url: "x", auth: "t" });
  // same name + same config → unchanged
  reports = applyArtifacts(artifacts, dir, "p");
  assert.deepEqual(reports, [{ target: ".mcp.json", action: "unchanged" }]);
  // same config in a different key order → no false conflict
  writeFileSync(join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { jira: { auth: "t", url: "x" } } }));
  assert.doesNotThrow(() => applyArtifacts(artifacts, dir, "p"));
  // same name + different config → throws
  writeFileSync(join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { jira: { url: "OTHER" } } }));
  assert.throws(() => applyArtifacts(artifacts, dir, "p"), /already defines server 'jira'/);
});

test("hooks reconcile via managed manifest: apply, reapply, replace, remove; foreign entries kept", () => {
  const dir = tmp();
  // pre-existing user hook must survive every apply
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(
    join(dir, ".claude/settings.json"),
    JSON.stringify({ other: true, hooks: { PostToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "user-hook" }] }] } }),
  );

  const artifacts = collectArtifacts(PILOT);
  applyArtifacts(artifacts, dir, PILOT.id);
  let settings = readJson(join(dir, ".claude/settings.json"));
  assert.equal(settings.other, true, "unrelated settings preserved");
  assert.equal(settings.hooks.PostToolUse.length, 2, "user hook + managed hook");

  // idempotent reapply
  const second = applyArtifacts(artifacts, dir, PILOT.id);
  assert.ok(second.every((r) => r.action === "unchanged"), JSON.stringify(second));
  settings = readJson(join(dir, ".claude/settings.json"));
  assert.equal(settings.hooks.PostToolUse.length, 2, "no duplicate on reapply");

  // module removed from the agent → managed hook removed, user hook kept
  const without = collectArtifacts({ ...PILOT, modules: ["testing/skill"] });
  applyArtifacts(without, dir, PILOT.id);
  settings = readJson(join(dir, ".claude/settings.json"));
  assert.equal(settings.hooks.PostToolUse.length, 1);
  assert.equal(settings.hooks.PostToolUse[0].hooks[0].command, "user-hook");
});

test("skills: written under .claude/skills/<name>/SKILL.md, removed when no longer contributed", () => {
  const dir = tmp();
  applyArtifacts(collectArtifacts(PILOT), dir, PILOT.id);
  const skillPath = join(dir, ".claude/skills/taskflow-run-tests/SKILL.md");
  assert.ok(existsSync(skillPath));
  assert.match(readFileSync(skillPath, "utf-8"), /^---\nname: taskflow-run-tests/);

  applyArtifacts(collectArtifacts({ ...PILOT, modules: ["testing/hook"] }), dir, PILOT.id);
  assert.ok(!existsSync(skillPath), "skill removed when module dropped");
});

test("full pilot apply is idempotent end-to-end", () => {
  const dir = tmp();
  const artifacts = collectArtifacts(PILOT);
  applyArtifacts(artifacts, dir, PILOT.id);
  const second = applyArtifacts(artifacts, dir, PILOT.id);
  assert.ok(second.length > 0);
  assert.ok(second.every((r) => r.action === "unchanged"), JSON.stringify(second));
  rmSync(dir, { recursive: true });
});

test("regression (review blocker): applying other agents never removes an installed integration", async () => {
  const { COMPOSED_AGENTS } = await import("../dist/index.js");
  const dir = tmp();
  applyArtifacts(collectArtifacts(PILOT), dir, PILOT.id);
  const skillPath = join(dir, ".claude/skills/taskflow-run-tests/SKILL.md");
  assert.ok(existsSync(skillPath), "pilot installed");

  // the routine `prompt-build --compose --apply` iterates every built-in agent
  for (const def of Object.values(COMPOSED_AGENTS)) {
    applyArtifacts(collectArtifacts(def), dir, def.id);
  }
  assert.ok(existsSync(skillPath), "pilot skill survives built-in applies");
  const settings = readJson(join(dir, ".claude/settings.json"));
  assert.ok(
    JSON.stringify(settings).includes("taskflow:testing"),
    "pilot hook survives built-in applies",
  );
  // and the pilot's own reapply is still idempotent
  const again = applyArtifacts(collectArtifacts(PILOT), dir, PILOT.id);
  assert.ok(again.every((r) => r.action === "unchanged"));
});

test("skill name collisions across agents throw instead of silently overwriting", () => {
  const dir = tmp();
  applyArtifacts(collectArtifacts(PILOT), dir, PILOT.id);
  const registry = {
    s: { id: "s", title: "S", kind: "skill", source: "builtin", name: "taskflow-run-tests", content: "---\nname: x\n---\nother" },
  };
  const other = collectArtifacts({ id: "other-agent", title: "O", modules: ["s"] }, registry);
  assert.throws(
    () => applyArtifacts(other, dir, "other-agent"),
    /already managed by agent 'pilot'/,
  );
});

test("N94: script-carrying hooks — write 0755, substitute vars, remove with the module", async () => {
  const { ACTIVITY_AGENT, MODULE_REGISTRY } = await import("../dist/index.js");
  const { statSync } = await import("node:fs");
  const dir = tmp();
  const artifacts = collectArtifacts(ACTIVITY_AGENT);
  const reports = applyArtifacts(artifacts, dir, ACTIVITY_AGENT.id, {
    INSIGHT_FLOW_BIN: "npx insight-flow",
  });
  // 6 scripts + settings
  const scriptPath = join(dir, ".claude/hooks/lifecycle-agent-idle.sh");
  assert.ok(existsSync(scriptPath), "lifecycle script written");
  assert.equal(statSync(scriptPath).mode & 0o111, 0o111, "script is executable");
  const content = readFileSync(scriptPath, "utf-8");
  assert.ok(content.includes("npx insight-flow log-event"), "bin var substituted");
  assert.ok(!content.includes("__INSIGHT_FLOW_BIN__"), "no tokens left");
  const settings = readJson(join(dir, ".claude/settings.json"));
  assert.equal(Object.keys(settings.hooks).length, 6, "six events registered");
  assert.equal(settings.hooks.Stop[0].hooks[0].timeout, 10, "timeout preserved");

  // idempotent with same vars
  const second = applyArtifacts(artifacts, dir, ACTIVITY_AGENT.id, {
    INSIGHT_FLOW_BIN: "npx insight-flow",
  });
  assert.ok(second.every((r) => r.action === "unchanged"), JSON.stringify(second));

  // removing a module removes its script + entry, keeps the rest
  const without = {
    ...ACTIVITY_AGENT,
    modules: ACTIVITY_AGENT.modules.filter((m) => m !== "activity/agent-idle"),
  };
  applyArtifacts(collectArtifacts(without), dir, ACTIVITY_AGENT.id, {
    INSIGHT_FLOW_BIN: "npx insight-flow",
  });
  assert.ok(!existsSync(scriptPath), "removed script deleted");
  const after = readJson(join(dir, ".claude/settings.json"));
  assert.equal(after.hooks.Stop, undefined, "Stop entry removed");
  assert.ok(after.hooks.SessionStart, "other lifecycle entries intact");
  assert.ok(MODULE_REGISTRY["activity/agent-idle"], "module still registered");
});

test("N95: adopting the testing bundle yields identical artifacts to listing the siblings", () => {
  const viaBundle = collectArtifacts({ id: "p", title: "P", modules: ["testing"] });
  const viaSiblings = collectArtifacts({
    id: "p",
    title: "P",
    modules: ["testing/prompt", "testing/hook", "testing/skill"],
  });
  assert.deepEqual(viaBundle, viaSiblings);
  // and applying via the bundle is idempotent like any other apply
  const dir = tmp();
  applyArtifacts(viaBundle, dir, "p");
  const second = applyArtifacts(viaBundle, dir, "p");
  assert.ok(second.every((r) => r.action === "unchanged"), JSON.stringify(second));
});

test("schema rejects unsafe skill names (path traversal)", async () => {
  const { AgentModuleSchema } = await import("../dist/index.js");
  for (const bad of ["../evil", "a/b", ".hidden", "UPPER"]) {
    assert.throws(
      () => AgentModuleSchema.parse({ id: "s", title: "S", kind: "skill", name: bad, content: "x" }),
      `skill name '${bad}' should be rejected`,
    );
  }
});
