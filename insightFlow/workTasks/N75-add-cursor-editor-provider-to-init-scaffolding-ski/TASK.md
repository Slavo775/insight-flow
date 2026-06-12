# N75 — Add Cursor editor provider to init scaffolding (skills + rules) via a provider seam

**Type:** feat
**Priority:** medium
**Created:** 2026-05-29

## Problem

insight-flow's lifecycle integration is hard-wired to Claude Code: `initProject` (`packages/taskflow/src/init/index.ts`) writes `.claude/commands/*.md` skill files and a `CLAUDE.md` marker section. Cursor users (and, next, OpenAI/Codex) get zero scaffolding, so the agent workflow is Claude-only. The `insight-flow` CLI engine is already editor-agnostic — only the init/scaffolding layer is coupled — so adding an editor is a rendering-target problem, not an engine problem.

## Goal

1. An editor-"provider" seam in the init/scaffolding layer; the canonical role bodies + context section render to N editors from one source.
2. Existing Claude scaffolding refactored to flow through the seam as the `claude` provider, producing output identical to today.
3. A `cursor` provider that emits `.cursor/skills/<name>/SKILL.md` + a Cursor rules file.
4. `insight-flow init --editor claude|cursor|all`, defaulting to auto-detect.
5. Seam shaped so a future `openai`/`codex` provider is purely additive (no engine/canonical-source edits).

## Scope

### In scope

- `packages/taskflow/src/init/index.ts` — extract skill-command + CLAUDE.md generation (the inlined `SKILL_*` consts + `generateClaudeMd`) into the provider seam.
- New `packages/taskflow/src/init/providers/`: `types.ts` (`EditorProvider` interface), `claude.ts`, `cursor.ts`, `index.ts` (registry + selector + auto-detect).
- `packages/taskflow/src/cli.ts` — parse `--editor claude|cursor|all` for the `init` command.
- Cursor skills: folder-per-skill `.cursor/skills/<name>/SKILL.md` with YAML frontmatter `name`/`description`; body adapted from the canonical role with NO `$ARGUMENTS` reliance (Cursor skills don't substitute it).
- Cursor context/rules file (target TBD — see Notes).
- Auto-detect by presence of `.claude/` vs `.cursor/`; `--editor all` scaffolds both.
- Init integration tests covering the cursor provider + selection/auto-detect.

### Out of scope

- Porting hooks / live-dashboard activity+event streaming to Cursor (`.cursor/hooks.json`, camelCase event-name map, stdin field-shape diffs, the optional "move hook parsing into the binary" refactor) → **follow-up Phase-2 task**.
- Any change to the `insight-flow` CLI engine (task state, dashboard, `log-event`).
- Implementing the OpenAI/Codex provider (design the seam for it only).

## Implementation plan

1. **Define the provider interface** — `providers/types.ts`: `EditorProvider { id; detect(cwd): boolean; writeSkills(ctx): Result; writeContext(ctx): Result; }`. Lift the canonical skill/role bodies (today's `SKILL_*` consts in `init/index.ts`) into a shared source both providers consume — single source of truth.
2. **Extract the `claude` provider** — move `.claude/commands/*.md` generation + the `CLAUDE.md` marker-section logic (`generateClaudeMd`) into `providers/claude.ts`. Init must produce byte-identical output for existing Claude projects (guard with a snapshot test).
3. **Add the `cursor` provider** — `providers/cursor.ts`: write `.cursor/skills/<name>/SKILL.md` (frontmatter + body with `$ARGUMENTS` removed/translated to "read the user's message") and the Cursor rules file.
4. **Wire selection** — registry + selector in `providers/index.ts`; `cli.ts` parses `--editor` (default auto-detect, fallback `claude`); `initProject` loops the selected providers.
5. **Overwrite/skip policy** — reuse the current "create vs skip existing, force overrides" semantics for provider files.
6. **Publish sync** — confirm/extend `packages/taskflow/scripts/sync-role-templates.mjs` so per-provider rendering stays in sync at publish; canonical roles remain the source.
7. **Docs** — update CLAUDE.md "Extending agents" + `packages/taskflow/README.md` for `--editor` and the Cursor layout.

## Verification

- `pnpm --dir packages/taskflow run build` + `npx tsc --noEmit` clean.
- `insight-flow init --editor cursor` in a temp dir → `.cursor/skills/<name>/SKILL.md` (valid frontmatter, no `$ARGUMENTS`) + a Cursor rules file; **no** `.claude/` writes.
- `insight-flow init --editor claude` → output byte-identical to pre-refactor (snapshot test).
- `insight-flow init --editor all` → both trees present.
- Bare `insight-flow init` with only `.cursor/` present auto-selects cursor.
- `pnpm --dir packages/taskflow test` passes, including new cursor cases.

## Notes

- Source of truth: `ANALYSIS.md` in this folder (from `/task-analyze`) — Claude→Cursor mapping, the 4-layer coupling model, and parity caveats.
- DECIDED: Cursor context/rules target = root `AGENTS.md` (verified against cursor.com/docs/rules; shared with the future OpenAI/Codex provider). Render via a marker-section merge like `CLAUDE.md`; `cursor`+`openai` providers share the one `AGENTS.md` section, `claude` keeps `CLAUDE.md`.
- OPEN: re-render policy on existing provider files — overwrite vs skip (mirror current Claude skip-unless-`--force`).
- OPEN: `sync-role-templates.mjs` interaction with per-provider rendering at publish.
- Cursor skills auto-discover from `.cursor/skills/` (also `.agents/skills/`); manual invoke `/skill-name`; `disable-model-invocation: true` makes a skill slash-only — consider for `task-analyze`/`taskmaster`.
- Phase-2 hooks caveats: Cursor has no clean equivalent of Claude's `PermissionRequest`; Cursor cloud agents don't fire session/prompt hooks. The approval→sound→push design for that future task is recorded in `ANALYSIS.md` → "Phase-2 design — approval → sound + push on Cursor".
- Engine stays untouched (CLAUDE.md "Two pieces only").
