/**
 * Regression test for N16: insight-flow's agent prompts must contain NO
 * specific technology names. Project-specific commands belong in the
 * user's `taskflow.config.json.agents.extend.<agent>` arrays.
 *
 * The test greps every canonical prompt file for forbidden literal-technology
 * strings and fails if any appear OUTSIDE an explicitly-marked example block
 * (`<!-- example: ... -->` HTML comment immediately preceding the fenced
 * block, or an `Example:` prose line immediately preceding the fence).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));

const FILES = [
  "AGENT_PROTOCOL.md",
  "AGENT_ENFORCEMENT.md",
  "PR_API.md",
  "TASKMASTER_ROLE.md",
  "TASKMASTER_CHANGE_ROLE.md",
  "TASK_IMPLEMENTER_ROLE.md",
  "TASK_REVIEWER_ROLE.md",
  "TASK_REVIEW_FIXER_ROLE.md",
  "TASK_HUMAN_REVIEW_ROLE.md",
  "TASK_INCIDENT_ROLE.md",
  "TASK_REQUEST_CHANGES_ROLE.md",
  ".claude/commands/task-git.md",
];

// Forbidden anywhere outside an example block.
const FORBIDDEN = [
  // Package managers + language toolchains.
  /\bnpx\b/,
  /\bnpm run\b/,
  /\bpnpm \b/,
  /\byarn \b/,
  /\bbun \b/,
  /\btsc\b/,
  /\btsconfig\b/,
  // Git hosts + their CLIs.
  /\bgh pr\b/,
  /\bgh --\b/,
  /\bglab \b/,
  /github\.com/,
  /gitlab\.com/,
  // Language manifests.
  /pyproject/i,
  /requirements\.txt/,
  /pom\.xml/,
  /\bgo\.mod\b/,
  /Cargo\.toml/,
  // Specific Claude model identifiers — added in N16 round 2.
  // Canonical agent prompts must use a model-agnostic trailer like
  // `Co-Authored-By: Claude Code <noreply@anthropic.com>` so the
  // attribution stays honest under Opus, Sonnet, Haiku, or future models.
  /\bClaude (Opus|Sonnet|Haiku) \d/,
];

// Substrings we explicitly allow even in canonical prose. They refer to
// insight-flow's own CLI (universal) or to user-extension key names
// (`agents.extend.task-git`).
const ALLOWED_SUBSTRINGS = ["agents.extend", "taskflow.config.json", "insight-flow"];

function stripExampleBlocks(content) {
  // Drop any fenced code block that is preceded (within 8 lines) by a marker
  // line: `<!-- example: ... -->` or a paragraph/heading starting with
  // `Example:` (case-insensitive). Anything inside such a block is scrubbed.
  //
  // Marker → fence distance is capped at 8 lines. If a future doc places the
  // marker further away, the test will *false-alarm* (flag the block as
  // non-example) rather than miss a violation — that's the safe direction.
  // If you hit a false alarm, move the marker closer to its fence rather
  // than bumping this constant; markers should sit immediately above the
  // block they label.
  const lines = content.split("\n");
  const out = [];
  let inBlock = false;
  let inExampleBlock = false;
  let recentMarkerLines = 0;

  for (const line of lines) {
    const markerLine = /^\s*<!--\s*example/i.test(line) || /^\s*Example:/i.test(line);
    if (markerLine) {
      recentMarkerLines = 8;
      out.push("/* example marker */");
      continue;
    }

    if (/^\s*```/.test(line)) {
      if (!inBlock) {
        inBlock = true;
        inExampleBlock = recentMarkerLines > 0;
        out.push(inExampleBlock ? "/* example fence */" : line);
        continue;
      } else {
        const wasMarked = inExampleBlock;
        inBlock = false;
        inExampleBlock = false;
        out.push(wasMarked ? "/* example fence */" : line);
        continue;
      }
    }

    if (inBlock && inExampleBlock) {
      out.push("/* example line */");
      continue;
    }

    out.push(line);
    if (recentMarkerLines > 0) recentMarkerLines--;
  }
  return out.join("\n");
}

function findForbiddenHits(content, file) {
  const scrubbed = stripExampleBlocks(content);
  const hits = [];
  const lines = scrubbed.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("/* example")) continue;
    const stripped = ALLOWED_SUBSTRINGS.reduce((acc, s) => acc.split(s).join(""), line);
    for (const pattern of FORBIDDEN) {
      if (pattern.test(stripped)) {
        hits.push({ file, line: i + 1, content: line.trim(), pattern: pattern.source });
      }
    }
  }
  return hits;
}

test("canonical agent prompts contain no specific technology names outside example blocks", () => {
  const allHits = [];
  for (const rel of FILES) {
    const full = resolve(REPO_ROOT, rel);
    if (!existsSync(full)) continue;
    const content = readFileSync(full, "utf-8");
    allHits.push(...findForbiddenHits(content, rel));
  }
  assert.deepEqual(
    allHits,
    [],
    `Technology-tight content found outside example blocks:\n${allHits
      .map((h) => `  ${h.file}:${h.line}  /${h.pattern}/  →  ${h.content}`)
      .join("\n")}`,
  );
});
