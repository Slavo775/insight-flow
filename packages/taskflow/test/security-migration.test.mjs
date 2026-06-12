/**
 * N98 — legacy-consumer security migration. Pre-N98 consumers have role files
 * referencing @AGENT_ENFORCEMENT.md only (security reached them via a line
 * embedded in the generated enforcement file). After upgrading, regenerating
 * the enforcement file drops that embedded line — so `prompt-build --apply`
 * must insert the standalone @AGENT_SECURITY.md include into such role files,
 * or the guardrails silently vanish (the exact review-blocker repro).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, "../dist/cli.js");

function legacyConsumer() {
  const dir = mkdtempSync(join(tmpdir(), "n98-migration-"));
  mkdirSync(join(dir, ".claude/roles"), { recursive: true });
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({ workDir: "workTasks", rolesDir: ".claude/roles" }),
  );
  // Pre-N98 role file: enforcement + protocol includes, no security.
  writeFileSync(
    join(dir, ".claude/roles/TASK_IMPLEMENTER_ROLE.md"),
    "ROLE: Old Consumer Role\n\nIntro.\n\n@AGENT_ENFORCEMENT.md\n@AGENT_PROTOCOL.md\n\nINPUT CONTRACT\n\n- x\n",
  );
  // Pre-N98 generated enforcement file with the embedded security line.
  writeFileSync(
    join(dir, ".claude/roles/AGENT_ENFORCEMENT.md"),
    "@AGENT_SECURITY.md\nSTRICT ENFORCEMENT — TASK FILE MUTATIONS\n\n- old generated content\n",
  );
  return dir;
}

test("N98: prompt-build --apply migrates legacy role files instead of dropping security", () => {
  const dir = legacyConsumer();
  execFileSync("node", [CLI, "prompt-build", "--apply"], { cwd: dir, stdio: "pipe" });

  const role = readFileSync(join(dir, ".claude/roles/TASK_IMPLEMENTER_ROLE.md"), "utf-8");
  const lines = role.split("\n");
  const sec = lines.indexOf("@AGENT_SECURITY.md");
  const enf = lines.indexOf("@AGENT_ENFORCEMENT.md");
  assert.ok(sec !== -1, "security include inserted into the legacy role file");
  assert.equal(sec + 1, enf, "security sits immediately above enforcement");

  const enforcement = readFileSync(join(dir, ".claude/roles/AGENT_ENFORCEMENT.md"), "utf-8");
  assert.ok(!enforcement.includes("AGENT_SECURITY"), "regenerated enforcement is security-free");

  // Net effect: security still reachable — exactly once.
  assert.equal(lines.filter((l) => l === "@AGENT_SECURITY.md").length, 1);

  // Idempotent: second apply changes nothing.
  execFileSync("node", [CLI, "prompt-build", "--apply"], { cwd: dir, stdio: "pipe" });
  const second = readFileSync(join(dir, ".claude/roles/TASK_IMPLEMENTER_ROLE.md"), "utf-8");
  assert.equal(second, role, "second apply is a no-op on the role file");
});
