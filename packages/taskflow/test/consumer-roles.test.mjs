/**
 * N275 — consumer prompts carry the real roles. A Claude built-in command
 * @-includes the role file init writes; a Cursor skill inlines that role's
 * content (incl. the security guardrails); and the shipped templates/roles/*
 * stay byte-identical to the canonical root files. Requires a prior build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");
const repoRoot = resolve(here, "../../..");
const templatesRoles = resolve(here, "../templates/roles");

function initIn(editor, extraConfig) {
  const dir = mkdtempSync(join(tmpdir(), "n275-"));
  if (extraConfig) writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify(extraConfig));
  execFileSync(process.execPath, [CLI, "init", "--editor", editor], {
    cwd: dir,
    encoding: "utf-8",
  });
  return dir;
}

test("A16: a Claude built-in command @-includes the role file, which carries the security baseline", () => {
  const dir = initIn("claude");
  try {
    const cmd = readFileSync(resolve(dir, ".claude/commands/task-implement.md"), "utf-8");
    assert.match(
      cmd,
      /@\.claude\/roles\/TASK_IMPLEMENTER_ROLE\.md/,
      "command @-includes the role file",
    );
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

test("blocker 1: a Cursor include cannot traverse out to an arbitrary .md file", () => {
  const dir = mkdtempSync(join(tmpdir(), "n275-trav-"));
  // A sentinel .md OUTSIDE the project; the agents.custom description tries to
  // inline it via a traversal ref.
  const sentinel = join(tmpdir(), `n275-SENTINEL-${process.pid}.md`);
  const leak = `LEAK_${process.pid}_DO_NOT_INLINE`;
  writeFileSync(sentinel, leak);
  const rel = "../".repeat(10) + sentinel.replace(/^\/+/, ""); // relative traversal ref
  try {
    writeFileSync(
      join(dir, "taskflow.config.json"),
      JSON.stringify({
        agents: {
          custom: [
            {
              name: "evil",
              role: "Evil",
              description: `See the notes.\n@${rel}\nmore text`,
            },
          ],
        },
      }),
    );
    execFileSync(process.execPath, [CLI, "init", "--editor", "cursor"], {
      cwd: dir,
      encoding: "utf-8",
    });
    const skill = readFileSync(resolve(dir, ".cursor/skills/evil/SKILL.md"), "utf-8");
    assert.ok(!skill.includes(leak), "the traversed file's content must NOT be inlined");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(sentinel, { force: true });
  }
});

test("blocker 2: a legacy stub command is upgraded to the @-include form; user edits are not", () => {
  const dir = initIn("claude");
  try {
    const cmdDir = resolve(dir, ".claude/commands");
    // Plant a KNOWN legacy stub (a real old consumer's file) + a user-edited one.
    const legacy = readFileSync(
      resolve(repoRoot, "playground/.claude/commands/task-implement.md"),
      "utf-8",
    );
    writeFileSync(resolve(cmdDir, "task-implement.md"), legacy);
    writeFileSync(resolve(cmdDir, "task-review.md"), "MY OWN task-review command\n");
    execFileSync(process.execPath, [CLI, "init", "--editor", "claude"], {
      cwd: dir,
      encoding: "utf-8",
    });
    const upgraded = readFileSync(resolve(cmdDir, "task-implement.md"), "utf-8");
    assert.match(upgraded, /@\.claude\/roles\/TASK_IMPLEMENTER_ROLE\.md/, "legacy stub upgraded");
    assert.equal(
      readFileSync(resolve(cmdDir, "task-review.md"), "utf-8"),
      "MY OWN task-review command\n",
      "a user-edited command is preserved",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("blocker 3: a custom rolesDir is honored in the command body and the role exists there", () => {
  const dir = initIn("claude", { rolesDir: "docs/roles" });
  try {
    const cmd = readFileSync(resolve(dir, ".claude/commands/task-implement.md"), "utf-8");
    assert.match(
      cmd,
      /@docs\/roles\/TASK_IMPLEMENTER_ROLE\.md/,
      "command points at the custom rolesDir",
    );
    assert.ok(
      existsSync(resolve(dir, "docs/roles/TASK_IMPLEMENTER_ROLE.md")),
      "the role file was written to the custom rolesDir",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("A80: shipped templates/roles are byte-identical to the canonical root files", () => {
  const files = readdirSync(templatesRoles).filter((f) => f.endsWith(".md"));
  assert.ok(files.length >= 10, "there are role templates to check");
  for (const f of files) {
    const rootPath = resolve(repoRoot, f);
    // #5 — every shipped template currently has a canonical root file; assert it
    // (a silent `continue` would let a deleted/renamed root pass the drift test).
    assert.ok(
      existsSync(rootPath),
      `templates/roles/${f} has no canonical root ${f} — did it move?`,
    );
    assert.equal(
      readFileSync(resolve(templatesRoles, f), "utf-8"),
      readFileSync(rootPath, "utf-8"),
      `templates/roles/${f} drifted from the canonical root ${f} — run sync-roles`,
    );
  }
});
