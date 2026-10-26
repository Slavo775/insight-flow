import type { CustomAgent } from "../../../core/types.js";
import type { SkillDef } from "./types.js";
import { composeAgentById } from "../../compose.js";
import { mergedComposedAgents, mergedModuleRegistry } from "../../user-registry.js";
import { deriveCommandName } from "../../../core/schema/index.js";
import { AGENT_ROLE_FILE_MAP } from "../../agents.js";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { createHash } from "node:crypto";
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
 * `init` writes into `config.rolesDir` (default `.claude/roles/`, which in turn
 * pulls in AGENT_SECURITY / AGENT_ENFORCEMENT / AGENT_GIT …), instead of the old
 * ~10-line summary. This is how this very repo's `.claude/commands/*.md` work, so
 * the security, protocol and git-permission guardrails actually reach the
 * consumer's agent. The command file is a thin generated pointer; users customize
 * the role files, which `init` preserves.
 *
 * Review blocker 3: honor `config.rolesDir` — a hardcoded `.claude/roles/` left
 * the agent with NO role when a project configured a custom rolesDir.
 */
const builtinBody = (name: string, rolesDir: string = ".claude/roles"): string =>
  `@${rolesDir.replace(/\/+$/, "")}/${AGENT_ROLE_FILE_MAP[name]}\n\n$ARGUMENTS\n`;

/** Built-in skill metadata (name + description), in context-section-table order.
 *  The body is composed per-init from `rolesDir` (see {@link buildSkillList}). */
const BUILTIN_SKILL_META: ReadonlyArray<{ name: string; description: string }> = [
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
];

/**
 * N275 (review blocker 2) — sha256 of every historical built-in command body
 * insight-flow has ever written (collected by walking git history + a real older
 * consumer). A `.claude/commands/<name>.md` whose content hashes to one of these
 * is insight-flow's OWN former output (a legacy stub), never user content, so
 * re-init may safely UPGRADE it to the @-include form. Anything else is reported
 * as a conflict and preserved. Incompleteness is safe: an unknown body is simply
 * reported, not clobbered.
 */
const LEGACY_STUB_SHA256: ReadonlySet<string> = new Set([
  "23eaff4c12ae5decb396841feddfa8b4f3f5c9af4a7c37ff2f9fac857e4482f8",
  "2460414be814ac7d24d4dcfbe4f4f1a02a39b5d59d0b2ba89bc9cc583531f33d",
  "2488974ee7c0493e3d73abe697beac5300ae91682442beae81db965681377766",
  "254d0c17e7f9268983864747fe6e10aa1e40ef12fe3534dfbf3e5d8e0e74d4d7",
  "4410100c027153c05e11eac21fc3b76b32a030c9179f2f3450dbb7230e8cdfbc",
  "845e97120168afd029afff529e7c5b5c31c8b255d4f8743db3097485a68a4dcc",
  "850d73723dc1ac28776b0a3e021595c11fb7dfec6e5c36f884f0f30ff3306145",
  "895d61055215f19ad6d06539ee3740aa6adb6b0460a606c93c66bcdeed5bdb7b",
  "9c00831ea26e41b55bf0ab8335f8e82e14d6f7e90fb8e6ed01f26fa508859b80",
  "bc6cdac210d36a77db7cbc500b8738f2e61fab382649edcef03fe9e7545c1d4a",
  "cfbeecb06d6eb128c100a24093126daa19c1fd76dbbfa0e3a2882071197ffa78",
  "daadb2cae28085c9676a94af160d44da5113206e9214a023248db706cd97ca56",
  "e397b0feb9e985a95b93bec50fb0b891c5c6faae133b64cd4eec3fab3a97f452",
]);

/** True if `text` is a known legacy insight-flow-written built-in command stub. */
export function isLegacyStub(text: string): boolean {
  return LEGACY_STUB_SHA256.has(createHash("sha256").update(text).digest("hex"));
}

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
export function buildSkillList(
  customAgents: CustomAgent[] = [],
  rolesDir: string = ".claude/roles",
): SkillDef[] {
  const builtins: SkillDef[] = BUILTIN_SKILL_META.map((s) => ({
    ...s,
    body: builtinBody(s.name, rolesDir),
    // No `overwrite`: init writes a built-in when missing, UPGRADES a known
    // legacy stub (isLegacyStub), and REPORTS a user-edited one — the tested
    // in-place-init contract.
  }));
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
 * N275 (A17) — resolve a single `@<ref>.md` include to its content for Cursor.
 * Any `@<path>/X.md` (e.g. `@.claude/roles/X.md`, `@docs/roles/X.md`, a bare
 * `@X.md`) resolves to the shipped `templates/roles/<basename>`; `AGENT_ENFORCEMENT.md`
 * is generated, so it comes from `buildEnforcementBlock()`.
 *
 * Review blocker 1 — SECURITY: resolve by BASENAME against the shipped templates
 * ONLY. The ref text is repo-controlled (an `agents.custom` description can place
 * a `@…` line in the body), so a raw path like `@../../../.claude/CLAUDE.md` must
 * never read an arbitrary file. The filesystem path is always
 * `templates/roles/<safe-basename>`; a non-basename or unknown name returns null.
 */
function resolveCursorInclude(ref: string): string | null {
  const name = basename(ref);
  if (!/^[A-Za-z0-9_-]+\.md$/.test(name)) return null; // no traversal / weird names
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
    // Key the cycle/repeat guard by BASENAME so `@.claude/roles/X.md` and `@X.md`
    // (same file) aren't inlined twice (review #4).
    const key = basename(ref);
    if (seen.has(key)) return ""; // cycle / repeat guard
    const content = resolveCursorInclude(ref);
    if (content == null) return ""; // unresolved / rejected → drop the line
    seen.add(key);
    // Recurse so a role file's own @-includes are inlined too.
    return toCursorBody(content, seen).replace(/\n+$/, "");
  });
  return (
    inlined
      .replace(/\$ARGUMENTS/g, "") // drop the placeholder anywhere it appears
      // review #1 — includes are now INLINED, never dropped, so no `---` is left
      // dangling; the old blanket `---`-stripper also removed every real section
      // separator from the role files. Removed.
      .replace(/\n{3,}/g, "\n\n") // collapse blank runs
      .replace(/[ \t]+$/gm, "") // strip trailing spaces per line
      .trimEnd() + "\n"
  );
}
