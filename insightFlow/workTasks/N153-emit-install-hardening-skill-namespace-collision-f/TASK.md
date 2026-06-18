# N153 — emit/install hardening — skill-namespace collision, frontmatter escaping, empty-prompt, ARGUMENTS parity

**Type:** fix
**Priority:** medium
**Created:** 2026-06-18

## Problem

- Four small correctness gaps in the agent emit/compose path, flagged in review (N138, N149) and deferred:
  1. **Skill-namespace collision not cross-checked** — `applyCommands` claims names only against other agents' `entry.commands` and `applySkills` only against `entry.skills`; but a `command` with `as: "skill"` and a `skill` module deriving the **same** name both write `.claude/skills/<name>/SKILL.md` → silent overwrite/thrash, bypassing the collision guard.
  2. **Skill frontmatter not escaped** — `collectArtifacts` interpolates `description: ${def.description ?? def.title}` raw; a `:` or other YAML metacharacter yields invalid frontmatter.
  3. **Empty-prompt command** — an agent of only non-text modules yields a near-empty `composeAgent` output → a blank command body is written.
  4. **`$ARGUMENTS` parity (N149)** — `init`'s claude provider appends `\n\n$ARGUMENTS\n` to command bodies, but the N149 force-emitted command in `flowArtifacts` omits it, so overwriting a built-in source's command drops the arg placeholder.

## Goal

1. A `skill` module and a `command as:"skill"` deriving the same name are detected as a collision (the existing guard fires) instead of silently overwriting.
2. Skill frontmatter `description` is safely escaped/quoted (valid YAML for any single-line input).
3. An empty composed prompt does not produce a blank installed command (skipped, with a warning).
4. Force-emitted commands include `$ARGUMENTS` for parity with init-scaffolded commands.

## Scope

### In scope

- `packages/taskflow/src/agents/emit.ts` — `applyCommands` + `applySkills` cross-namespace collision check (both share `.claude/skills/<name>`): when `as: "skill"`, also scan `entry.skills`; have `applySkills` scan command-derived skill names.
- `packages/taskflow/src/agents/compose.ts` — `collectArtifacts`: quote/JSON-stringify the skill `description` in the frontmatter; skip (or warn + skip) emitting a command whose `composeAgent` body is empty/whitespace.
- `packages/taskflow/src/agents/flow-install.ts` — append `\n\n$ARGUMENTS\n` to the N149 force-emitted command body (match `init/providers/skills.ts`).
- Tests under `packages/taskflow/test/` (extend `emit.test.mjs` / `compose.test.mjs`) for the collision, escaping, empty-prompt skip, and `$ARGUMENTS` presence.

### Out of scope

- No change to the command/skill artifact model or install plan shape.
- No change to happy-path emit output beyond the four fixes.
- Do not unify init's direct command writing with the artifact emitter (separate concern).

## Implementation plan

1. **Cross-namespace collision.** In `emit.ts`, factor the name-claim check so a `command` with `as:"skill"` checks BOTH `entry.commands` and `entry.skills`, and `applySkills` checks command-derived skill names — they all land in `.claude/skills/<name>`.
2. **Frontmatter escaping.** In `collectArtifacts`, replace the raw `description: ${…}` with a YAML-safe value (`JSON.stringify(value)` produces a valid double-quoted scalar).
3. **Empty-prompt guard.** In `collectArtifacts`, when the composed prompt is empty after trim, skip pushing the command (and `console.error` a warning naming the agent).
4. **$ARGUMENTS parity.** In `flow-install.ts` force-emit, append `\n\n$ARGUMENTS\n` to the body.
5. **Tests** for each.

## Verification

- `pnpm --dir packages/taskflow run typecheck` + `lint` + `format:check` clean.
- `pnpm --dir packages/taskflow test` passes incl. the new cases (collision fires; frontmatter valid; empty-prompt skipped; force-emit body ends with `$ARGUMENTS`).

## Notes

- Sources: N138 REVIEW.md (3 hardening notes), N149 REVIEW.md ($ARGUMENTS parity). Mined from N99–N150 (see N151 ANALYSIS.md).
- Low-risk; all in the emit/compose layer. Independent of N154/N155/N156.
