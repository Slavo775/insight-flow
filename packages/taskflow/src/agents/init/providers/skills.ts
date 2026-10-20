import type { CustomAgent } from "../../../core/types.js";
import type { SkillDef } from "./types.js";
import { composeAgentById } from "../../compose.js";
import { mergedComposedAgents, mergedModuleRegistry } from "../../user-registry.js";
import { deriveCommandName } from "../../../core/schema/index.js";
import { AGENT_ROLE_FILE_MAP } from "../../agents.js";
import { existsSync, readFileSync } from "node:fs";
import { resolvePackageAsset } from "../../../core/paths.js";
import { buildEnforcementBlock } from "../../../cli/commands/prompt-build.js";

/**
 * Canonical built-in skill bodies — the single source of truth for every
 * editor provider. These are the exact strings insight-flow has always
 * written to `.claude/commands/<name>.md`; the `claude` provider writes them
 * verbatim, the `cursor` provider transforms them via {@link toCursorBody}.
 *
 * Lifted out of `init/index.ts` in N75 so multiple editors render from one
 * source instead of duplicating prompt text per provider.
 */
/**
 * N275 (A16) — a built-in command body `@`-includes the full role file that
 * `init` writes into `.claude/roles/` (which in turn pulls in AGENT_SECURITY /
 * AGENT_ENFORCEMENT / AGENT_GIT …), instead of the old ~10-line summary. This is
 * how this very repo's `.claude/commands/*.md` work, so the security, protocol
 * and git-permission guardrails actually reach the consumer's agent. The command
 * file is a thin generated pointer (`overwrite: true` refreshes stale stubs on
 * re-init); users customize the role files, which `init` preserves.
 */
const builtinBody = (name: string): string =>
  `@.claude/roles/${AGENT_ROLE_FILE_MAP[name]}\n\n$ARGUMENTS\n`;

/** Canonical built-in skills, in the order they appear in the context-section table. */
const BUILTIN_SKILLS: ReadonlyArray<SkillDef> = [
  {
    name: "task-analyze",
    description:
      "Pre-taskmaster strategist: challenge the brief, propose alternatives, then hand off to /taskmaster",
  },
  { name: "taskmaster", description: "Create a new task spec (TASK.md + CHECKLIST.md)" },
  { name: "task-implement", description: "Implement a task from its spec" },
  { name: "task-review", description: "AI code review of implemented task" },
  { name: "task-human-review", description: "Record human review feedback" },
  { name: "task-review-fix", description: "Fix issues from review" },
  { name: "task-git", description: "Branch, commit, push, PR, merge" },
  { name: "task-incident", description: "Track production incidents" },
  { name: "task-request-changes", description: "Request post-implementation changes" },
  { name: "taskmaster-change", description: "Modify an existing task spec" },
  // No `overwrite` flag: init writes a built-in command when missing and REPORTS
  // (never clobbers) a same-named command whose content differs — the tested
  // in-place-init contract, which protects a user-edited command. A fresh install
  // gets the @-include form; an old stub is reported so the user can re-init.
].map((s) => ({ ...s, body: builtinBody(s.name) }));

/**
 * Compose a custom agent's canonical (claude-form) body — byte-identical to
 * the file insight-flow has always written for `agents.custom` entries.
 */
function composeCustomAgentBody(agent: CustomAgent): string {
  const lines: string[] = [
    `ROLE: ${agent.role}`,
    "",
    // N275 (A80) — emit the full prompt-injection baseline trio, matching what
    // composed agents get. Previously only @AGENT_ENFORCEMENT.md was included,
    // so a legacy `agents.custom` entry ran without the security/protocol
    // guardrails the N98 baseline promises for "every role".
    "@AGENT_SECURITY.md",
    "@AGENT_ENFORCEMENT.md",
    "@AGENT_PROTOCOL.md",
    "",
    "---",
    "",
    "## Description",
    "",
    agent.description,
    "",
  ];
  if (agent.outputContract) {
    lines.push("## Output Contract", "", agent.outputContract, "");
  }
  lines.push("$ARGUMENTS", "");
  return lines.join("\n");
}

/**
 * The full skill set every provider renders: built-ins first (table order),
 * then any custom agents. Single source — providers must not hard-code prompts.
 */
export function buildSkillList(customAgents: CustomAgent[] = []): SkillDef[] {
  const builtins = BUILTIN_SKILLS.map((s) => ({ ...s }));
  const custom = customAgents.map((a) => ({
    name: a.name,
    body: composeCustomAgentBody(a),
    description: a.description,
    // Custom agents are config-derived — refresh on every init so a changed
    // role/description/outputContract propagates without requiring --force
    // (matches insight-flow's pre-N75 always-overwrite behaviour for them).
    overwrite: true,
  }));
  // N124 — composer custom agents (insightFlow/agents/, N107) become slash
  // commands too: /<id> with the composed prompt. Appended last so they
  // converge with / win over a same-named legacy config.agents.custom.
  return [...builtins, ...custom, ...composerAgentSkills()];
}

/**
 * N124 — scaffold one `/<id>` command per composer custom agent
 * (`insightFlow/agents/`), body = its composed prompt over the merged registry.
 * A broken user space degrades to no extra commands.
 */
export function composerAgentSkills(): SkillDef[] {
  let agents, registry;
  try {
    agents = mergedComposedAgents();
    registry = mergedModuleRegistry();
  } catch {
    return [];
  }
  return Object.values(agents)
    .filter((a) => a.id.startsWith("custom:"))
    .map((a) => ({
      // N275 (A49) — use the SAME command name the installer derives
      // (deriveCommandName → `task-<tail>`), so init and `install` no longer
      // scaffold two different commands (`/foo` + `/task-foo`) for one agent.
      name: deriveCommandName(a.id),
      body: `${composeAgentById(a.id, agents, registry)}\n\n$ARGUMENTS\n`,
      description: a.description ?? a.title,
      overwrite: true,
    }));
}

/**
 * Transform a canonical (claude-form) body into a Cursor SKILL.md body:
 * drop `@`-includes (Claude-only resolution) and the `$ARGUMENTS` placeholder
 * (Cursor skills don't substitute it), and tidy the resulting blank runs.
 */
/**
 * N275 (A17) — resolve a single `@<ref>.md` include to its content for Cursor.
 * `@.claude/roles/X.md` and `@X.md` both map to the shipped `templates/roles/X.md`;
 * `@AGENT_ENFORCEMENT.md` is generated, so it comes from `buildEnforcementBlock()`.
 * An unresolved ref returns null (the line is dropped, as before).
 */
function resolveCursorInclude(ref: string): string | null {
  const name = ref.replace(/^\.claude\/roles\//, "");
  if (name === "AGENT_ENFORCEMENT.md") return buildEnforcementBlock();
  try {
    const assetPath = resolvePackageAsset(`templates/roles/${name}`);
    if (existsSync(assetPath)) return readFileSync(assetPath, "utf-8");
  } catch {
    /* fall through to drop */
  }
  return null;
}

/**
 * Transform a canonical (claude-form) body into a Cursor SKILL.md body. Cursor
 * does not resolve `@`-includes, so — N275 (A17) — we INLINE each referenced
 * file's content (recursively) instead of dropping it, otherwise a Cursor skill
 * would run with none of the security / enforcement / protocol guardrails the
 * `@`-includes carry. `$ARGUMENTS` is dropped (Cursor doesn't substitute it).
 */
export function toCursorBody(body: string, seen: Set<string> = new Set()): string {
  const INCLUDE = /^@([A-Za-z0-9_./-]+\.md)[ \t]*$/gm;
  const inlined = body.replace(INCLUDE, (whole, ref: string) => {
    if (seen.has(ref)) return ""; // cycle / repeat guard
    const content = resolveCursorInclude(ref);
    if (content == null) return ""; // unresolved → drop the line (prior behavior)
    seen.add(ref);
    // Recurse so a role file's own @-includes are inlined too.
    return toCursorBody(content, seen).replace(/\n+$/, "");
  });
  return (
    inlined
      .replace(/\$ARGUMENTS/g, "") // drop the placeholder anywhere it appears
      // a `---` separator left dangling right after a dropped/unneeded include
      .replace(/^---[ \t]*\n(?=\s*$)/gm, "")
      .replace(/\n{3,}/g, "\n\n") // collapse blank runs
      .replace(/[ \t]+$/gm, "") // strip trailing spaces per line
      .trimEnd() + "\n"
  );
}
