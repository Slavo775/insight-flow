# N75 — Add Cursor editor provider to init scaffolding (skills + rules) via a provider seam — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-01
**PR:** https://github.com/Slavo775/insight-flow/pull/50
**Verdict:** approved

## Summary

Phase-1 editor-provider seam. The canonical skill bodies are lifted from `init/index.ts` into `providers/skills.ts` (single source); `init` now scaffolds through `selectProviders()` with a `claude` provider (byte-identical to before) and a new `cursor` provider (`.cursor/skills/<name>/SKILL.md` + `AGENTS.md`). `--editor claude|cursor|all` added, default auto-detect. Engine untouched; Claude-only steps (role templates, enforcement, hooks) gated behind `claudeSelected`. **Low risk** — the high-risk surface (Claude output) is locked by a snapshot test proving byte-identical output, and the cursor path is purely additive. Reviewed the full diff + ran all six selection paths manually.

## Checklist verification

- [x] `EditorProvider` interface + registry/selector — pass (`providers/types.ts`, `providers/index.ts`)
- [x] Canonical bodies in one shared source — pass (`providers/skills.ts` `BUILTIN_SKILLS`; no per-provider duplication)
- [x] `claude` provider byte-identical — pass (test 1 diffs every command + CLAUDE.md against a captured pre-refactor baseline)
- [x] `cursor` writes `.cursor/skills/<name>/SKILL.md`, valid frontmatter, no `$ARGUMENTS` — pass (test 2 + manual)
- [x] `cursor` writes `AGENTS.md` context — pass (marker section, "Cursor Skills" heading)
- [x] `--editor claude|cursor|all` + auto-detect — pass (tests 3–5; invalid editor rejected without scaffolding, test 6)
- [x] Engine + hooks untouched; hooks deferred — pass (no engine files changed; hooks gated on `claudeSelected`)
- [~] README + CLAUDE.md document `--editor` — **partial**: README fully updated; repo `CLAUDE.md` deliberately not edited to avoid bundling a pre-existing unrelated uncommitted edit into N75. Acceptable (see Notes).

Quality gates: `tsc --noEmit` clean; full suite (11 files, incl. new `cursor-provider.test.mjs`) green.

## Non-blocking

**Resolution (post-review, applied to the uncommitted implementation at the user's request — no fix-needed lifecycle since the review approved):** #1 and #2 fixed; #3 was already satisfied. See the Round-1 fix note below.

- ✅ **#1 fixed** — added an `overwrite` flag to `SkillDef` (`providers/types.ts`); `buildSkillList` sets it `true` for custom agents, and both providers write when `!exists || force || skill.overwrite`. Verified: editing a custom agent's description + plain `init` (no `--force`) now refreshes both the `.claude` command and `.cursor` skill. Built-ins keep write-if-missing / `--force`.
- ✅ **#2 fixed** — `toCursorBody` now strips an `@`-include together with a following `---` separator, so custom-agent Cursor skills read `ROLE: …` → `## Description` with no dangling rule. Verified.

1. **`--force` overwrite semantics changed (spec-aligned).** `claude.writeSkills`/`cursor.writeSkills` use `!exists || force` uniformly. Pre-refactor, built-in `.claude/commands/*.md` were write-if-missing (ignored `--force`) and custom-agent commands were *always* overwritten. Net effect: a plain (non-`--force`) re-`init` no longer refreshes an existing **custom-agent** command file when its `agents.custom` description/role changes — `--force` is now required (the `CLAUDE.md`/`AGENTS.md` table still updates via marker upsert). This matches the spec's stated "create vs skip existing, force overrides" semantics (`TASK.md` step 5), so recorded as a deliberate, documented change rather than a blocker. Fix if undesired: add a per-skill `overwrite` flag (custom = always).
2. **Cosmetic — orphaned `---` in custom-agent Cursor skills.** `toCursorBody` strips the `@AGENT_ENFORCEMENT.md` line but leaves the following `---` horizontal rule, so a custom-agent `SKILL.md` reads `ROLE: …` → `---` → `## Description`. Valid markdown, harmless; could drop a leading rule in the transform if tidiness matters. (Built-in skills are unaffected — they have no `@`-includes.)
3. **Baseline fixture is a tripwire.** `test/fixtures/claude-baseline/` must be regenerated *intentionally* whenever a built-in prompt changes, or test 1 will (correctly) fail. Worth a one-line note in the test header — already present.

## Security & edge cases

- Invalid `--editor` returns before any filesystem writes (verified: no `taskflow.config.json`/`.claude`/`.cursor`). Good fail-closed behavior.
- Cursor frontmatter `description` is double-quoted with `"`/`\\` escaped, so colons/slashes in descriptions stay valid YAML.
- `--editor` passed without a value resolves to `undefined` → auto-detect (rather than erroring). Reasonable; no injection surface.

## Notes

- Phase-2 (Cursor hooks / live-dashboard streaming) intentionally out of scope; design recorded in `ANALYSIS.md`.
- Repo `CLAUDE.md` left untouched on purpose: it has a pre-existing 1-line cosmetic edit (not part of N75) in the slash-command table; editing it would entangle that into the N75 commit. README is the canonical place for the `--editor` flag docs and is complete.
- `sync-role-templates.mjs` needs no change — Cursor skill prompts come from the bundled `skills.ts`, not `templates/roles`.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-01
**Verdict:** approved

### Summary

Human approved and requested merge. Exact wording: "done merge it".

### Checklist verification

Deferred to the AI round above (approved); no additional items raised by the human.

### Blockers

None.

### Non-blocking

None raised.

### Security & edge cases

None raised.

### Notes

Approved for merge into `main` via PR #50.
