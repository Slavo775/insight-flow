/**
 * Smoke tests for the activity-hook helper + install-activity-hook command.
 * Run: node test/activity-hook.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/index.js", import.meta.url));

const mod = await import(DIST).catch(() => {
  console.error("Build dist/index.js before running tests: pnpm run build");
  process.exit(1);
});

// The helper is exposed indirectly via initProject's effects and the CLI.
// We test the underlying activity-hook module by importing it from the
// compiled output directly.
const helperPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
assert.ok(existsSync(helperPath), "dist/cli.js must exist (run build first)");

// We can't import dist/cli.js (it has side effects) — exercise the helper via
// a child_process invocation of the CLI binary inside a tmp project.
import { execFileSync } from "node:child_process";

function tmpProject(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-hook-test-"));
  const enabled = opts.activityEnabled !== false;
  // Minimal taskflow.config.json so resolveConfig() succeeds.
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify(
      {
        workDir: "workTasks",
        shardSize: 10,
        projectName: "hook-test",
        rolesDir: ".claude/roles",
        server: { port: 6006 },
        activityEngine: { enabled, logFile: ".taskflow-activity.jsonl", maxEvents: 200 },
      },
      null,
      2,
    ),
  );
  mkdirSync(resolve(dir, "workTasks"));
  writeFileSync(
    resolve(dir, "workTasks", "master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  return dir;
}

function runCli(dir, args) {
  return execFileSync("node", [helperPath, ...args], { cwd: dir, encoding: "utf-8" });
}

function runCliExpectFail(dir, args) {
  try {
    execFileSync("node", [helperPath, ...args], { cwd: dir, encoding: "utf-8", stdio: "pipe" });
    return { code: 0, stdout: "", stderr: "" };
  } catch (err) {
    return {
      code: err.status,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

test("install-activity-hook installs hook and registers settings on a fresh project", () => {
  const dir = tmpProject();
  try {
    const out = runCli(dir, ["install-activity-hook"]);
    const parsed = JSON.parse(out.trim());
    assert.equal(parsed.action, "install-activity-hook");
    assert.equal(parsed.result, "installed");
    assert.equal(parsed.hookWritten, true);
    assert.equal(parsed.settingsUpdated, true);
    assert.ok(existsSync(resolve(dir, ".claude/hooks/taskflow-activity.sh")));
    const settings = JSON.parse(readFileSync(resolve(dir, ".claude/settings.local.json"), "utf-8"));
    const entries = settings.hooks.PostToolUse || [];
    assert.ok(
      entries.some((e) => (e.command || "").includes("taskflow-activity.sh")),
      "settings.local.json must register the hook command",
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("install-activity-hook is idempotent — second run is a no-op", () => {
  const dir = tmpProject();
  try {
    runCli(dir, ["install-activity-hook"]);
    const second = runCli(dir, ["install-activity-hook"]);
    const parsed = JSON.parse(second.trim());
    assert.equal(parsed.action, "install-activity-hook");
    assert.equal(parsed.result, "already-installed");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("install-activity-hook refuses when activityEngine.enabled is false", () => {
  const dir = tmpProject({ activityEnabled: false });
  try {
    const r = runCliExpectFail(dir, ["install-activity-hook"]);
    assert.notEqual(r.code, 0, "command must exit non-zero");
    assert.match(r.stderr, /activityEngine\.enabled: false/, "must explain why it refused");
    assert.ok(
      !existsSync(resolve(dir, ".claude/hooks/taskflow-activity.sh")),
      "must not create hook script when refused",
    );
    assert.ok(
      !existsSync(resolve(dir, ".claude/settings.local.json")),
      "must not create settings file when refused",
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("install-activity-hook --force overrides activityEngine.enabled=false", () => {
  const dir = tmpProject({ activityEnabled: false });
  try {
    const out = runCli(dir, ["install-activity-hook", "--force"]);
    const parsed = JSON.parse(out.trim());
    assert.equal(parsed.result, "installed");
    assert.ok(existsSync(resolve(dir, ".claude/hooks/taskflow-activity.sh")));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("install-activity-hook preserves existing unrelated PostToolUse hooks", () => {
  const dir = tmpProject();
  try {
    const settingsPath = resolve(dir, ".claude/settings.local.json");
    mkdirSync(resolve(dir, ".claude"));
    writeFileSync(
      settingsPath,
      JSON.stringify(
        { hooks: { PostToolUse: [{ command: ".claude/hooks/other.sh", timeout: 1000 }] } },
        null,
        2,
      ),
    );
    runCli(dir, ["install-activity-hook"]);
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const cmds = settings.hooks.PostToolUse.map((e) => e.command);
    assert.ok(cmds.includes(".claude/hooks/other.sh"), "existing hook must remain");
    assert.ok(cmds.includes(".claude/hooks/taskflow-activity.sh"), "new hook must be appended");
  } finally {
    rmSync(dir, { recursive: true });
  }
});
