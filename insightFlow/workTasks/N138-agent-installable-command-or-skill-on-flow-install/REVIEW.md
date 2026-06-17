# N138 — Review

**Verdict:** approved
**Reviewer:** task-review (AI)
**Date:** 2026-06-17
**PR:** none yet (working-tree review on `feat/N137-N138-composer-ux`)

## Summary

Full-stack opt-in for installing a composed agent's own prompt as a runnable `/task-<slug>` command or skill on flow install: schema (`command` field + `deriveCommandName` + reserved-collision `superRefine`), composer (`AgentArtifacts.commands`), emitter (`applyCommands` with the per-agent managed manifest), `flowInstallPlan` `command` step, `/api/agents` round-trip, and the `AgentForm` UI (checkbox + command/skill toggle + live name preview + collision error). 8 new tests + an `emit.test.mjs` fixup; typecheck/lint/format/tests all green (the lone `master-boot` failure is pre-existing flake, untouched here).

## Checklist verification

- ✅ Schema supports `command: { install, as: "command" | "skill" }` (optional, `as` defaults to `command`).
- ✅ Name forced to `task-<slug>`; no double-prefix (`deriveCommandName` skips when the tail starts with `task`); reserved built-in names rejected — schema `superRefine` **and** client submit guard.
- ✅ `AgentArtifacts.commands`; `collectArtifacts` builds the body from `composeAgent(def)` (skill target prepends `name`/`description` frontmatter).
- ✅ `flowInstallPlan` adds a `command` step with the correct `.claude/commands` or `.claude/skills` target.
- ✅ `applyCommands` writes the file and records it in `.claude/taskflow-managed.json`; re-apply is idempotent; clearing the opt-in (or changing target kind) removes the old artifact.
- ✅ `AgentForm` exposes checkbox + command/skill toggle + `/task-…` preview.
- ✅ `docs/architecture-diagrams.md` Diagram 1 updated for the open-ended slash-command lane; package README composer section updated.
- ⚠️ "Cursor projects emit the skill target" — partially: implemented as the user-selectable `as: "skill"` option (skills port to `.cursor/skills/` via `init`), **not** runtime auto-downgrade of command→skill for Cursor projects. Consistent with the existing emitter (which writes under `.claude/`) and the spec's "full Cursor command parity out of scope." Acceptable; see Notes.

## Non-blocking

1. **Skill-namespace collision not cross-checked.** `applyCommands` claims names against other agents' `entry.commands` only; `applySkills` claims against `entry.skills` only. A `command` with `as: "skill"` and a `skill` module that derive the *same* name both write `.claude/skills/<name>/SKILL.md`, so they could silently overwrite each other (and thrash on re-apply) without the existing collision guard firing. Low likelihood (needs a skill module literally named `task-<slug>` matching a derived command name), but it's the exact failure mode the skill guard exists to prevent. **Suggested hardening:** when `as === "skill"`, also scan `entry.skills` for the name (and have `applySkills` scan `entry.commands`), since both share the `.claude/skills` namespace.
2. **Skill frontmatter not escaped.** `description: ${def.description ?? def.title}` is interpolated raw; a `:` or other YAML metacharacter in the description would produce invalid frontmatter. Single-line input rules out newlines, but **suggest** quoting/JSON-stringifying the value.
3. **Empty-prompt command.** An agent composed of only non-text modules yields a near-empty `composeAgent` output, so the installed command body is effectively blank. **Suggest** skipping/​warning when the composed prompt is empty.

## Security & edge cases

- **Path safety:** the command/skill name comes solely from `deriveCommandName(def.id)`, and `DefinitionIdSchema` constrains custom-id tails to `[a-z0-9-]`. The result is always `task-<safe-slug>` — a safe path segment, no traversal. ✅
- **Reserved-name collision:** rejected at the schema (`superRefine`) and surfaced client-side before submit — defense in depth. ✅ (tested: `custom:implement` → `task-implement` rejected)
- **Idempotency / removal:** change-detected writes; opt-out and target-kind change remove the prior artifact; manifest bucket is dropped when empty. ✅ (tested)
- **Cross-agent same command name** throws instead of overwriting. ✅ (tested)
- Synthetic flow `install` def carries no `command`, so the install-list path can't emit a command — no crash. ✅

## Notes

- The Cursor decision (offer `as: "skill"` rather than auto-detect) keeps the flow-install emitter behavior uniform with the existing skill emitter; full runtime Cursor command parity is explicitly out of scope per the spec.
- Recommend addressing non-blocking #1 before this feature sees heavy multi-agent/skill-module use; #2/#3 are minor.
- Pairs with **N137** (composed-module UI).

## Request Changes

**Requested by:** Human (Project Owner)
**Date:** 2026-06-17

### Changes requested

- **Improvement (UX):** _"we should have in overview agents detail also the command to know what command it is please"_ — On the agent detail / overview page (`/agent/<id>`, rendered by `packages/taskflow/src/dashboard/client/AgentDetail.tsx`), when the agent opts into install-command (`agent.command?.install`), show the installed command/skill name so the user can see **what command the agent is** — e.g. `installs /task-test-agent (command)` or `(skill)`.
  - The data is already available: `AgentDto.command` (`{ install, as }`) is surfaced by `/api/agents` (N138), and the name is `deriveCommandName(agent.id)`.
  - Natural placement: the header `Sub` line in `AgentDetail.tsx:87` (alongside `· N modules in sequence · M shared · Edit`), e.g. append `· installs /task-test-agent (command)`. Show nothing when the agent has no install-command opt-in.
  - `deriveCommandName` is mirrored client-side in `AgentForm.tsx` (N138); reuse it (extract to a shared client helper, or re-mirror) so the detail page derives the same name.

### Notes

- Scope: read-only display of existing data on the detail page — no schema/emit/flow-install changes. Pairs with the N138 feature it surfaces.

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-17
**Verdict:** approved

### Blockers

- None.

### Suggestions (non-blocking)

- None (the 3 AI-review hardening notes remain tracked as future follow-ups, not blockers).

### Notes

- _"okej approved great create pr if not exist via gh and merge it into master thanks"_ — approved after the change-request fix (agent detail now shows the installed command); landed via PR merged to `main`.
