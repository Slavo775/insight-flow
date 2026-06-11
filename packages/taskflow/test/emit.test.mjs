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

test("mcp-server merge: dedup by name, conflict on different config", () => {
  const dir = tmp();
  const registry = {
    a: { id: "a", title: "A", kind: "mcp-server", source: "builtin", name: "jira", config: { url: "x" } },
  };
  const artifacts = collectArtifacts({ id: "p", title: "P", modules: ["a"] }, registry);
  let reports = applyArtifacts(artifacts, dir);
  assert.deepEqual(reports, [{ target: ".mcp.json", action: "created" }]);
  assert.deepEqual(readJson(join(dir, ".mcp.json")).mcpServers.jira, { url: "x" });
  // same name + same config → unchanged
  reports = applyArtifacts(artifacts, dir);
  assert.deepEqual(reports, [{ target: ".mcp.json", action: "unchanged" }]);
  // same name + different config → throws, file untouched
  writeFileSync(join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { jira: { url: "OTHER" } } }));
  assert.throws(() => applyArtifacts(artifacts, dir), /already defines server 'jira'/);
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
  applyArtifacts(artifacts, dir);
  let settings = readJson(join(dir, ".claude/settings.json"));
  assert.equal(settings.other, true, "unrelated settings preserved");
  assert.equal(settings.hooks.PostToolUse.length, 2, "user hook + managed hook");

  // idempotent reapply
  const second = applyArtifacts(artifacts, dir);
  assert.ok(second.every((r) => r.action === "unchanged"), JSON.stringify(second));
  settings = readJson(join(dir, ".claude/settings.json"));
  assert.equal(settings.hooks.PostToolUse.length, 2, "no duplicate on reapply");

  // module removed from the agent → managed hook removed, user hook kept
  const without = collectArtifacts({ ...PILOT, modules: ["testing/skill"] });
  applyArtifacts(without, dir);
  settings = readJson(join(dir, ".claude/settings.json"));
  assert.equal(settings.hooks.PostToolUse.length, 1);
  assert.equal(settings.hooks.PostToolUse[0].hooks[0].command, "user-hook");
});

test("skills: written under .claude/skills/<name>/SKILL.md, removed when no longer contributed", () => {
  const dir = tmp();
  applyArtifacts(collectArtifacts(PILOT), dir);
  const skillPath = join(dir, ".claude/skills/taskflow-run-tests/SKILL.md");
  assert.ok(existsSync(skillPath));
  assert.match(readFileSync(skillPath, "utf-8"), /^---\nname: taskflow-run-tests/);

  applyArtifacts(collectArtifacts({ ...PILOT, modules: ["testing/hook"] }), dir);
  assert.ok(!existsSync(skillPath), "skill removed when module dropped");
});

test("full pilot apply is idempotent end-to-end", () => {
  const dir = tmp();
  const artifacts = collectArtifacts(PILOT);
  applyArtifacts(artifacts, dir);
  const second = applyArtifacts(artifacts, dir);
  assert.ok(second.length > 0);
  assert.ok(second.every((r) => r.action === "unchanged"), JSON.stringify(second));
  rmSync(dir, { recursive: true });
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
