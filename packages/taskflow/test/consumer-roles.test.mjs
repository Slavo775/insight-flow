/**
 * N275 — consumer prompts carry the real roles. A Claude built-in command
 * @-includes the role file init writes; a Cursor skill inlines that role's
 * content (incl. the security guardrails); and the shipped templates/roles/*
 * stay byte-identical to the canonical root files. Requires a prior build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");
const repoRoot = resolve(here, "../../..");
const templatesRoles = resolve(here, "../templates/roles");

function initIn(editor) {
  const dir = mkdtempSync(join(tmpdir(), "n275-"));
  execFileSync(process.execPath, [CLI, "init", "--editor", editor], { cwd: dir, encoding: "utf-8" });
  return dir;
}

test("A16: a Claude built-in command @-includes the role file, which carries the security baseline", () => {
  const dir = initIn("claude");
  try {
    const cmd = readFileSync(resolve(dir, ".claude/commands/task-implement.md"), "utf-8");
    assert.match(cmd, /@\.claude\/roles\/TASK_IMPLEMENTER_ROLE\.md/, "command @-includes the role file");
    assert.match(cmd, /\$ARGUMENTS/);
    // the referenced role file exists and pulls in the security guardrails
    const role = readFileSync(resolve(dir, ".claude/roles/TASK_IMPLEMENTER_ROLE.md"), "utf-8");
    assert.match(role, /@AGENT_SECURITY\.md/, "role file includes the security module");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("A17: a Cursor built-in skill inlines the security guardrails (no bare @-includes)", () => {
  const dir = initIn("cursor");
  try {
    const body = readFileSync(resolve(dir, ".cursor/skills/task-review/SKILL.md"), "utf-8");
    assert.match(body, /PROMPT INJECTION/, "Cursor skill inlines AGENT_SECURITY content");
    assert.ok(!/^@[A-Za-z0-9_./-]+\.md$/m.test(body), "no unresolved @-include lines remain");
    assert.ok(!body.includes("$ARGUMENTS"), "Cursor skills drop $ARGUMENTS");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("A80: shipped templates/roles are byte-identical to the canonical root files", () => {
  const files = readdirSync(templatesRoles).filter((f) => f.endsWith(".md"));
  assert.ok(files.length >= 10, "there are role templates to check");
  for (const f of files) {
    const rootPath = resolve(repoRoot, f);
    if (!existsSync(rootPath)) continue; // generated-at-init files have no root canonical
    assert.equal(
      readFileSync(resolve(templatesRoles, f), "utf-8"),
      readFileSync(rootPath, "utf-8"),
      `templates/roles/${f} drifted from the canonical root ${f} — run sync-roles`,
    );
  }
});
