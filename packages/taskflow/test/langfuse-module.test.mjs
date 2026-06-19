/**
 * N161 — Langfuse skill pointer module (opt-in, registry-only).
 *
 * Verifies the module is in the registry and emits its SKILL.md when a flow
 * includes it, but is NOT installed by default (absent from every shipped flow
 * / composed agent).
 *
 * Requires a prior build (imports from dist).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MODULE_REGISTRY,
  COMPOSED_AGENTS,
  DEFAULT_PROJECT,
  collectArtifacts,
  applyArtifacts,
} from "../dist/index.js";

const MODULE_ID = "langfuse/setup-skill";
const SKILL_NAME = "langfuse-setup";
const SKILL_REL = `.claude/skills/${SKILL_NAME}/SKILL.md`;

function tmp() {
  return mkdtempSync(join(tmpdir(), "n161-"));
}

test("module is registered as a skill named langfuse-setup", () => {
  const mod = MODULE_REGISTRY[MODULE_ID];
  assert.ok(mod, "langfuse/setup-skill present in MODULE_REGISTRY");
  assert.equal(mod.kind, "skill");
  assert.equal(mod.name, SKILL_NAME);
  assert.equal(mod.source, "builtin");
});

test("content is a pointer (plugin install + N157 cross-link), not a fork", () => {
  const { content } = MODULE_REGISTRY[MODULE_ID];
  assert.match(content, /^---\nname: langfuse-setup/);
  // points to the official plugin, not inlined content
  assert.match(content, /plugin marketplace add langfuse\/skills/);
  assert.match(content, /plugin install langfuse/);
  // cross-links the N157 lifecycle exporter
  assert.match(content, /observability/);
  assert.match(content, /langfuse/);
  // distinguishes the two halves
  assert.match(content, /lifecycle/i);
});

test("emits .claude/skills/langfuse-setup/SKILL.md when a flow includes it", () => {
  const dir = tmp();
  try {
    const agent = { id: "test-agent", title: "Test", modules: [MODULE_ID] };
    applyArtifacts(collectArtifacts(agent), dir, agent.id);
    const skillPath = join(dir, SKILL_REL);
    assert.ok(existsSync(skillPath), "skill file written");
    assert.match(readFileSync(skillPath, "utf-8"), /^---\nname: langfuse-setup/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("NOT installed by default: absent from the default project and every composed agent", () => {
  // project-level install list
  assert.ok(
    !DEFAULT_PROJECT.install.includes(MODULE_ID),
    "default project install must not include the langfuse module",
  );
  // no shipped composed agent composes it
  for (const def of Object.values(COMPOSED_AGENTS)) {
    assert.ok(
      !def.modules.includes(MODULE_ID),
      `composed agent '${def.id}' must not include ${MODULE_ID}`,
    );
  }
});

test("NOT installed by default: applying every built-in composed agent never writes the skill", () => {
  const dir = tmp();
  try {
    for (const def of Object.values(COMPOSED_AGENTS)) {
      applyArtifacts(collectArtifacts(def), dir, def.id);
    }
    assert.ok(
      !existsSync(join(dir, SKILL_REL)),
      "langfuse-setup skill must not appear from default installs",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
