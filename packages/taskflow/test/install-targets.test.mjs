/**
 * N174 — install targets (flow | agent | module) + reference-safe uninstall.
 * Covers: target dispatch (module non-installable kinds rejected, agent prompt
 * force-emitted), per-target ownership, reference-safe uninstall (a shared
 * artifact survives until its last owner is gone), N172 snapshot restore on
 * uninstall, the legacy project:<id> → flow:<id> bucket migration, and the
 * uninstall plan's removed-vs-retained classification.
 * Requires a prior build (imports from dist).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyArtifacts,
  uninstallTarget,
  uninstallPlan,
  targetArtifacts,
  installPlan,
  isInstallableModuleKind,
  NotInstallableError,
} from "../dist/index.js";

const tmp = () => mkdtempSync(join(tmpdir(), "n174-"));
const readJson = (p) => JSON.parse(readFileSync(p, "utf-8"));

// A small artifact set shared by several owners (one of each installable kind).
const artifacts = () => ({
  mcpServers: [{ name: "shared-mcp", config: { type: "http", url: "https://x" } }],
  hooks: [{ event: "PostToolUse", matcher: "Edit", command: "echo hi", timeout: 5 }],
  skills: [
    { name: "shared-skill", content: "---\nname: shared-skill\ndescription: x\n---\n\n# hi\n" },
  ],
  commands: [],
});

const mcp = (dir) => readJson(join(dir, ".mcp.json")).mcpServers ?? {};
const skillExists = (dir) => existsSync(join(dir, ".claude/skills/shared-skill/SKILL.md"));
const hooks = (dir) => {
  const p = join(dir, ".claude/settings.json");
  return existsSync(p) ? (readJson(p).hooks ?? {}) : {};
};

test("N174: reference-safe uninstall keeps a shared artifact until the last owner is gone", () => {
  const dir = tmp();
  applyArtifacts(artifacts(), dir, "flow:f");
  applyArtifacts(artifacts(), dir, "agent:a");

  // Removing one owner leaves everything in place (the other still owns it).
  uninstallTarget(dir, "agent:a");
  assert.ok(mcp(dir)["shared-mcp"], "mcp retained (flow still owns)");
  assert.ok(skillExists(dir), "skill retained");
  assert.ok(hooks(dir).PostToolUse, "hook retained");

  // Removing the last owner physically removes the artifacts.
  uninstallTarget(dir, "flow:f");
  assert.ok(!mcp(dir)["shared-mcp"], "mcp removed (last owner gone)");
  assert.ok(!skillExists(dir), "skill removed");
  assert.ok(!hooks(dir).PostToolUse, "hook removed");
});

test("N174: uninstall restores an mcp config the install force-overwrote (N172 undo)", () => {
  const dir = tmp();
  writeFileSync(
    join(dir, ".mcp.json"),
    JSON.stringify({ mcpServers: { "shared-mcp": { type: "http", url: "https://ORIGINAL" } } }),
  );
  applyArtifacts(artifacts(), dir, "flow:f", undefined, { force: true });
  assert.equal(mcp(dir)["shared-mcp"].url, "https://x", "force-overwrote the entry");

  uninstallTarget(dir, "flow:f");
  assert.equal(mcp(dir)["shared-mcp"].url, "https://ORIGINAL", "restored to the pre-install snapshot");
});

test("N174: uninstall migrates a legacy project:<id> bucket to flow:<id>", () => {
  const dir = tmp();
  applyArtifacts(artifacts(), dir, "flow:default");
  // Rewrite the bucket key to the pre-N174 shape.
  const mpath = join(dir, ".claude/taskflow-managed.json");
  const m = readJson(mpath);
  m.agents["project:default"] = m.agents["flow:default"];
  delete m.agents["flow:default"];
  writeFileSync(mpath, JSON.stringify(m, null, 2));

  // Uninstalling the flow target finds the migrated bucket and removes its artifacts.
  uninstallTarget(dir, "flow:default");
  assert.ok(!skillExists(dir), "migrated bucket's skill removed");
  assert.ok(!mcp(dir)["shared-mcp"], "migrated bucket's mcp removed");
});

test("N174: uninstallPlan classifies each owned artifact as retained or removed", () => {
  const dir = tmp();
  applyArtifacts(artifacts(), dir, "flow:f");
  applyArtifacts(artifacts(), dir, "module:m");

  const shared = uninstallPlan(dir, "module:m");
  assert.ok(shared.length >= 3, "plan covers mcp + hook + skill");
  assert.ok(
    shared.every((s) => s.action === "retained"),
    `all retained while shared: ${JSON.stringify(shared)}`,
  );

  uninstallTarget(dir, "flow:f");
  const sole = uninstallPlan(dir, "module:m");
  assert.ok(
    sole.every((s) => s.action === "removed"),
    `all removed once sole owner: ${JSON.stringify(sole)}`,
  );

  // An unknown bucket plans nothing.
  assert.deepEqual(uninstallPlan(dir, "flow:nope"), []);
});

test("N174: module target rejects non-installable kinds, installs artifact-bearing ones", () => {
  assert.equal(isInstallableModuleKind("mcp-server"), true);
  assert.equal(isInstallableModuleKind("skill"), true);
  assert.equal(isInstallableModuleKind("bundle"), true);
  assert.equal(isInstallableModuleKind("section"), false);
  assert.equal(isInstallableModuleKind("handover"), false);

  // testing/prompt is a `section` — nothing to install.
  assert.throws(() => targetArtifacts({ kind: "module", id: "testing/prompt" }), NotInstallableError);
  // testing/skill is a `skill` — installs its single skill file.
  const art = targetArtifacts({ kind: "module", id: "testing/skill" });
  assert.equal(art.skills.length, 1);
  assert.equal(art.skills[0].name, "taskflow-run-tests");
});

test("N174: agent target force-emits its composed prompt as a runnable command", () => {
  const art = targetArtifacts({ kind: "agent", id: "taskmaster" });
  assert.equal(art.commands.length, 1, "the composed prompt is emitted as a command");
  assert.ok(art.commands[0].body.includes("$ARGUMENTS"), "command carries $ARGUMENTS");
  const plan = installPlan({ kind: "agent", id: "taskmaster" });
  assert.ok(
    plan.some((s) => s.kind === "command"),
    "install plan lists the command",
  );
});
