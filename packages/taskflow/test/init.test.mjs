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
