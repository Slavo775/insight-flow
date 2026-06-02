/**
 * N78 — editor-aware init (config.editor precedence) + batch→bulk deprecated aliases.
 * Run: node test/bulk-editor.test.mjs   (build must run first)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const { buildBulkInitArgs } = await import(fileURLToPath(new URL("../dist/index.js", import.meta.url)));

function projectWith(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-n78-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks", shardSize: 10, projectName: "t", rolesDir: ".claude/roles",
      server: { port: 6006 }, ...extra,
    }),
  );
  return dir;
}

test("config.editor=cursor → bare init scaffolds cursor, not claude", () => {
  const dir = projectWith({ editor: "cursor" });
  try {
    execFileSync(process.execPath, [CLI, "init"], { cwd: dir, encoding: "utf-8" });
    assert.ok(existsSync(resolve(dir, ".cursor/skills")), "should scaffold .cursor from config.editor");
    assert.ok(!existsSync(resolve(dir, ".claude")), "should not scaffold .claude");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("--editor flag overrides config.editor", () => {
  const dir = projectWith({ editor: "cursor" });
  try {
    execFileSync(process.execPath, [CLI, "init", "--editor", "claude"], { cwd: dir, encoding: "utf-8" });
    assert.ok(existsSync(resolve(dir, ".claude/commands")), "flag should win → .claude");
    assert.ok(!existsSync(resolve(dir, ".cursor")), "config.editor cursor must be overridden");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("--editor is persisted into a freshly created config", () => {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-n78-fresh-"));
  try {
    execFileSync(process.execPath, [CLI, "init", "--editor", "all"], { cwd: dir, encoding: "utf-8" });
    const cfg = JSON.parse(readFileSync(resolve(dir, "taskflow.config.json"), "utf-8"));
    assert.equal(cfg.editor, "all", "fresh init should persist --editor into config.editor");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("bulk-init builds per-project init args incl. --editor passthrough", () => {
  assert.deepEqual(buildBulkInitArgs({ _: [] }), ["init"]);
  assert.deepEqual(buildBulkInitArgs({ _: [], force: true }), ["init", "--force"]);
  assert.deepEqual(buildBulkInitArgs({ _: [], editor: "all" }), ["init", "--editor", "all"]);
  assert.deepEqual(
    buildBulkInitArgs({ _: [], force: true, examples: true, editor: "cursor" }),
    ["init", "--force", "--examples", "--editor", "cursor"],
  );
});

test("deprecated `batch-ui` alias still dispatches + warns on stderr", () => {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-n78-alias-"));
  try {
    // --list is read-only (no servers killed, no writes); we only assert the warning.
    const res = spawnSync(process.execPath, [CLI, "batch-ui", "--list"], {
      cwd: dir, encoding: "utf-8", timeout: 4000,
    });
    assert.equal(res.status, 0, "alias should still succeed");
    assert.match(res.stderr, /deprecated.*bulk-ui/, "should warn pointing to bulk-ui");
  } finally {
    rmSync(dir, { recursive: true });
  }
});
