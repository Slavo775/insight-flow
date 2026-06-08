/**
 * Integration tests for N75 — the editor-provider seam.
 *   - `init --editor claude` is byte-identical to the captured pre-refactor
 *     baseline (fixtures/claude-baseline/).
 *   - `init --editor cursor` writes `.cursor/skills/<name>/SKILL.md` (valid
 *     frontmatter, no `$ARGUMENTS`) + `AGENTS.md`, and touches no `.claude/`.
 *   - `init --editor all` writes both trees.
 *   - bare `init` auto-detects by `.claude/` / `.cursor/` presence.
 *   - an unknown `--editor` value is rejected without scaffolding.
 *
 * Run: node test/cursor-provider.test.mjs   (build must run first)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const BASELINE = fileURLToPath(new URL("./fixtures/claude-baseline", import.meta.url));

const SKILL_NAMES = [
  "task-analyze",
  "taskmaster",
  "task-implement",
  "task-review",
  "task-review-fix",
  "task-human-review",
  "task-git",
  "task-incident",
  "task-request-changes",
  "taskmaster-change",
];

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), "taskflow-cursor-test-"));
}

function runInit(cwd, ...args) {
  return execFileSync(process.execPath, [CLI, "init", ...args], { cwd, encoding: "utf-8" });
}

test("init --editor claude is byte-identical to the pre-refactor baseline", () => {
  const dir = makeTempDir();
  try {
    runInit(dir, "--editor", "claude");

    for (const file of readdirSync(resolve(BASELINE, "commands"))) {
      const expected = readFileSync(resolve(BASELINE, "commands", file), "utf-8");
      const actual = readFileSync(resolve(dir, ".claude/commands", file), "utf-8");
      assert.equal(actual, expected, `.claude/commands/${file} drifted from baseline`);
    }

    const expectedClaudeMd = readFileSync(resolve(BASELINE, "CLAUDE.md"), "utf-8");
    const actualClaudeMd = readFileSync(resolve(dir, "CLAUDE.md"), "utf-8");
    assert.equal(actualClaudeMd, expectedClaudeMd, "CLAUDE.md drifted from baseline");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init --editor cursor writes SKILL.md files + AGENTS.md and no .claude", () => {
  const dir = makeTempDir();
  try {
    runInit(dir, "--editor", "cursor");

    assert.ok(!existsSync(resolve(dir, ".claude")), "cursor-only init must not create .claude/");
    assert.ok(existsSync(resolve(dir, "AGENTS.md")), "AGENTS.md should exist");

    const agents = readFileSync(resolve(dir, "AGENTS.md"), "utf-8");
    assert.match(agents, /<!-- taskflow:start -->/, "AGENTS.md should carry the taskflow marker");
    assert.match(
      agents,
      /## Slash Commands \(Cursor Skills\)/,
      "AGENTS.md heading should say Cursor",
    );

    for (const name of SKILL_NAMES) {
      const skillPath = resolve(dir, ".cursor/skills", name, "SKILL.md");
      assert.ok(existsSync(skillPath), `.cursor/skills/${name}/SKILL.md should exist`);
      const body = readFileSync(skillPath, "utf-8");
      assert.match(
        body,
        new RegExp(`^---\\nname: ${name}\\ndescription: "`),
        `bad frontmatter for ${name}`,
      );
      assert.ok(!body.includes("$ARGUMENTS"), `${name} SKILL.md must not contain $ARGUMENTS`);
      assert.ok(!/^@[A-Za-z_]+\.md$/m.test(body), `${name} SKILL.md must not contain @-includes`);
    }
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init --editor all writes both the claude and cursor trees", () => {
  const dir = makeTempDir();
  try {
    runInit(dir, "--editor", "all");

    assert.equal(readdirSync(resolve(dir, ".claude/commands")).length, SKILL_NAMES.length);
    assert.equal(readdirSync(resolve(dir, ".cursor/skills")).length, SKILL_NAMES.length);
    assert.ok(existsSync(resolve(dir, "CLAUDE.md")), "CLAUDE.md should exist");
    assert.ok(existsSync(resolve(dir, "AGENTS.md")), "AGENTS.md should exist");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("bare init auto-detects cursor when only .cursor/ is present", () => {
  const dir = makeTempDir();
  try {
    mkdirSync(resolve(dir, ".cursor"), { recursive: true });
    runInit(dir);

    assert.ok(existsSync(resolve(dir, ".cursor/skills")), "should scaffold .cursor/skills");
    assert.ok(
      !existsSync(resolve(dir, ".claude/commands")),
      "should not scaffold .claude/commands",
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("bare init falls back to claude when neither editor dir exists", () => {
  const dir = makeTempDir();
  try {
    runInit(dir);
    assert.ok(
      existsSync(resolve(dir, ".claude/commands")),
      "fresh project should default to claude",
    );
    assert.ok(!existsSync(resolve(dir, ".cursor")), "should not scaffold cursor by default");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init --editor <unknown> is rejected without scaffolding", () => {
  const dir = makeTempDir();
  try {
    // initProject prints the error (to stderr) and returns before writing
    // anything — so the project must be left untouched. (The message itself is
    // exercised via the message text; here we assert the no-op behaviour.)
    runInit(dir, "--editor", "vscode");
    assert.ok(!existsSync(resolve(dir, "taskflow.config.json")), "no config on invalid editor");
    assert.ok(!existsSync(resolve(dir, ".claude")), "no .claude on invalid editor");
    assert.ok(!existsSync(resolve(dir, ".cursor")), "no .cursor on invalid editor");
  } finally {
    rmSync(dir, { recursive: true });
  }
});
