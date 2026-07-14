/**
 * Integration tests for insight-flow init with agents config.
 * Uses Node.js built-in test runner (node:test) — no extra dependencies.
 * Run: node test/init.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

// Locate the compiled init function. Build must run before tests.
const DIST_INIT = fileURLToPath(new URL("../dist/index.js", import.meta.url));

let initProject;
try {
  const mod = await import(DIST_INIT);
  initProject = mod.initProject;
} catch {
  console.error("Build dist/index.js before running tests: pnpm run build:cli");
  process.exit(1);
}

const FIXTURE_CONFIG = fileURLToPath(new URL("./fixtures/taskflow.config.json", import.meta.url));

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), "taskflow-test-"));
}

test("init without agents config — no Project Extensions section", () => {
  const dir = makeTempDir();
  try {
    initProject(dir);
    const rolesDir = resolve(dir, ".claude/roles");
    if (existsSync(resolve(rolesDir, "TASK_IMPLEMENTER_ROLE.md"))) {
      const content = readFileSync(resolve(rolesDir, "TASK_IMPLEMENTER_ROLE.md"), "utf-8");
      assert.ok(!content.includes("## Project Extensions"), "Should have no extensions section");
    }
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init writes a technology-agnostic config (no stack / gitTool / prStrategy fields)", () => {
  const dir = makeTempDir();
  try {
    initProject(dir);
    const config = JSON.parse(readFileSync(resolve(dir, "taskflow.config.json"), "utf-8"));
    // Positive shape assertion — these are the canonical keys insight-flow ships.
    const allowedKeys = new Set([
      "workDir",
      "shardSize",
      "projectName",
      "rolesDir",
      "server",
      "activityEngine",
      "notifications",
      "agents",
    ]);
    for (const key of Object.keys(config)) {
      assert.ok(
        allowedKeys.has(key),
        `Unexpected key '${key}' in default config. insight-flow ships zero technology assumptions — anything outside the allowed set risks re-introducing the N15 blockers fixed by N16.`,
      );
    }
    // Specifically forbid the keys the N15/N16 history surfaced.
    assert.equal(config.stack, undefined, "init must not write a `stack` field");
    assert.equal(config.gitTool, undefined, "init must not write a `gitTool` field");
    assert.equal(config.prStrategy, undefined, "init must not write a `prStrategy` field");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("N207: init --examples no longer promotes agents.extend (deprecated), events on by default", () => {
  const dir = makeTempDir();
  try {
    initProject(dir, false, { examples: true });
    const body = readFileSync(resolve(dir, "taskflow.config.json"), "utf-8");
    assert.match(body, /"agents":/, "still has an agents block (for git permissions)");
    // agents.extend is deprecated — no promoted `extend` stub, just a deprecation note.
    assert.doesNotMatch(body, /"extend":\s*\{/, "no promoted agents.extend stub");
    assert.match(body, /DEPRECATED.*agents\.extend/i, "carries the agents.extend deprecation note");
    // Events on by default (N207).
    assert.match(body, /"enabled":\s*true/, "activityEngine.enabled defaults to true");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("N207: plain init writes activityEngine.enabled: true", () => {
  const dir = makeTempDir();
  try {
    initProject(dir, false, {});
    const cfg = JSON.parse(readFileSync(resolve(dir, "taskflow.config.json"), "utf-8"));
    assert.equal(cfg.activityEngine.enabled, true, "events on by default in a fresh init");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init with agents.extend — appends Project Extensions to role file", () => {
  const dir = makeTempDir();
  try {
    const fixtureConfig = JSON.parse(readFileSync(FIXTURE_CONFIG, "utf-8"));
    writeFileSync(resolve(dir, "taskflow.config.json"), JSON.stringify(fixtureConfig, null, 2));

    // Create a minimal role file to extend
    const rolesDir = resolve(dir, ".claude/roles");
    mkdirSync(rolesDir, { recursive: true });
    writeFileSync(
      resolve(rolesDir, "TASK_IMPLEMENTER_ROLE.md"),
      "ROLE: Task Implementer\n\nSome content here.\n",
    );

    initProject(dir, true);

    const content = readFileSync(resolve(rolesDir, "TASK_IMPLEMENTER_ROLE.md"), "utf-8");
    assert.ok(
      content.includes("## Project Extensions"),
      "Should contain Project Extensions section",
    );
    assert.ok(
      content.includes("Only use pnpm, never npm or yarn"),
      "Should contain first extension rule",
    );
    assert.ok(
      content.includes("All new files must have a corresponding test"),
      "Should contain second extension rule",
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init with agents.extend — idempotent (no duplicate sections)", () => {
  const dir = makeTempDir();
  try {
    const fixtureConfig = JSON.parse(readFileSync(FIXTURE_CONFIG, "utf-8"));
    writeFileSync(resolve(dir, "taskflow.config.json"), JSON.stringify(fixtureConfig, null, 2));

    const rolesDir = resolve(dir, ".claude/roles");
    mkdirSync(rolesDir, { recursive: true });
    writeFileSync(
      resolve(rolesDir, "TASK_IMPLEMENTER_ROLE.md"),
      "ROLE: Task Implementer\n\nSome content here.\n",
    );

    initProject(dir, true);
    initProject(dir, true);

    const content = readFileSync(resolve(rolesDir, "TASK_IMPLEMENTER_ROLE.md"), "utf-8");
    const count = (content.match(/## Project Extensions/g) || []).length;
    assert.strictEqual(count, 1, "Project Extensions should appear exactly once after two inits");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init with agents.custom — generates skill file", () => {
  const dir = makeTempDir();
  try {
    const fixtureConfig = JSON.parse(readFileSync(FIXTURE_CONFIG, "utf-8"));
    writeFileSync(resolve(dir, "taskflow.config.json"), JSON.stringify(fixtureConfig, null, 2));

    initProject(dir, true);

    const skillPath = resolve(dir, ".claude/commands/deploy-check.md");
    assert.ok(existsSync(skillPath), ".claude/commands/deploy-check.md should exist");

    const content = readFileSync(skillPath, "utf-8");
    assert.ok(content.includes("ROLE: Deploy Readiness Checker"), "Should have ROLE line");
    assert.ok(content.includes("@AGENT_ENFORCEMENT.md"), "Should reference AGENT_ENFORCEMENT.md");
    assert.ok(
      content.includes("Verify the project is ready for deployment"),
      "Should have description",
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init with agents.custom — registers agent in CLAUDE.md", () => {
  const dir = makeTempDir();
  try {
    const fixtureConfig = JSON.parse(readFileSync(FIXTURE_CONFIG, "utf-8"));
    writeFileSync(resolve(dir, "taskflow.config.json"), JSON.stringify(fixtureConfig, null, 2));

    initProject(dir, true);

    const claudeMd = readFileSync(resolve(dir, "CLAUDE.md"), "utf-8");
    assert.ok(claudeMd.includes("/deploy-check"), "CLAUDE.md should list /deploy-check");
    assert.ok(
      claudeMd.includes("Verify the project is ready for deployment"),
      "CLAUDE.md should include deploy-check description",
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("N222: init installs the composer-authoring flow when requested", async () => {
  const dir = makeTempDir();
  try {
    await initProject(dir, false, { yes: true, installFlows: ["composer-authoring"] });
    const cmds = resolve(dir, ".claude/commands");
    for (const c of [
      "task-authoring-analyze",
      "task-authoring-create",
      "task-authoring-implement",
      "task-authoring-review",
      "task-authoring-install",
    ]) {
      assert.ok(existsSync(resolve(cmds, c + ".md")), c + " command installed");
    }
    assert.ok(
      existsSync(resolve(dir, ".claude/agents/module-author.md")),
      "an authoring subagent installed",
    );
    const mcp = JSON.parse(readFileSync(resolve(dir, ".mcp.json"), "utf-8"));
    assert.ok(mcp.mcpServers && mcp.mcpServers.composer, "composer MCP server registered");
    // The default flow's commands are still there.
    assert.ok(existsSync(resolve(cmds, "taskmaster.md")), "default commands still present");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("N222: init surfaces an unknown flow id via flowErrors (no throw, no files)", async () => {
  const dir = makeTempDir();
  try {
    // N222 review-fix (blocker 1) — a requested flow that can't install is
    // reported back, not silently swallowed.
    const res = await initProject(dir, false, { yes: true, installFlows: ["not-a-real-flow"] });
    assert.ok(!existsSync(resolve(dir, ".mcp.json")), "no flow artifacts for an unknown id");
    assert.equal(res.flowErrors.length, 1, "the failure is reported");
    assert.equal(res.flowErrors[0].id, "not-a-real-flow");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("N222: init honors the explicit activity option (hook + persisted config)", async () => {
  const on = makeTempDir();
  const off = makeTempDir();
  try {
    const rOn = await initProject(on, false, { yes: true, activity: true });
    const rOff = await initProject(off, false, { yes: true, activity: false });
    assert.deepEqual(rOn.flowErrors, [], "no flow errors on a clean init");
    assert.ok(
      existsSync(resolve(on, ".claude/hooks/taskflow-activity.sh")),
      "activity:true installs the activity hook",
    );
    assert.ok(
      !existsSync(resolve(off, ".claude/hooks/taskflow-activity.sh")),
      "activity:false leaves the hook out",
    );
    // N222 review-fix (nb1) — explicit off persists enabled:false (so a later
    // init re-run won't silently re-enable it).
    const offCfg = JSON.parse(readFileSync(resolve(off, "taskflow.config.json"), "utf-8"));
    assert.equal(offCfg.activityEngine?.enabled, false, "activity:false persisted to config");
    void rOff;
  } finally {
    rmSync(on, { recursive: true });
    rmSync(off, { recursive: true });
  }
});

// N236 — in-place init into an existing folder must not clobber the user's
// .claude/ or CLAUDE.md; it merges (marker section) and only adds its own files.
test("in-place init preserves an existing .claude/ and CLAUDE.md", async () => {
  const dir = makeTempDir();
  try {
    mkdirSync(resolve(dir, ".claude/commands"), { recursive: true });
    writeFileSync(resolve(dir, ".claude/commands/my-cmd.md"), "USER COMMAND");
    writeFileSync(resolve(dir, "CLAUDE.md"), "# My project\n\nUser notes.\n");

    const result = await initProject(dir, false, { yes: true, registerHub: false });

    assert.equal(
      readFileSync(resolve(dir, ".claude/commands/my-cmd.md"), "utf-8"),
      "USER COMMAND",
      "user's command file is untouched",
    );
    const claudeMd = readFileSync(resolve(dir, "CLAUDE.md"), "utf-8");
    assert.ok(claudeMd.includes("User notes."), "keeps the user's CLAUDE.md content");
    assert.ok(claudeMd.includes("taskflow:start"), "adds the insight-flow marker section");
    assert.ok(existsSync(resolve(dir, "insightFlow/workTasks/master.json")), "scaffolds the store");
    assert.equal(result.conflicts.length, 0, "no conflict for an unrelated user command");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("in-place init reports (does not overwrite) a same-named command with different content", async () => {
  const dir = makeTempDir();
  try {
    mkdirSync(resolve(dir, ".claude/commands"), { recursive: true });
    writeFileSync(resolve(dir, ".claude/commands/task-implement.md"), "MY OWN task-implement");

    const result = await initProject(dir, false, { yes: true, registerHub: false });

    assert.equal(
      readFileSync(resolve(dir, ".claude/commands/task-implement.md"), "utf-8"),
      "MY OWN task-implement",
      "does not overwrite the user's file",
    );
    assert.ok(
      result.conflicts.includes(".claude/commands/task-implement.md"),
      "reports the conflict to the caller",
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});
