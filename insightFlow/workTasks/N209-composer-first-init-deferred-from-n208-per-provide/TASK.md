# N209 — Composer-first init (deferred from N208) — per-provider skills refactor

**Type:** feat
**Priority:** medium

## Problem

N208 tried to make `insight-flow init` composer-first (install the composer flow, drop the default `task-*` commands) but hit a real blocker and was reverted: init's `skills` list is **shared across providers**, so dropping the built-in `task-*` skills strips them from **Cursor** too — and the composer flow's `executeInstall` emits **Claude-only** artifacts, so a Cursor project would be left with no flow commands. A `byte-identical` baseline test also pins init's output. The `insight-flow install-flow <id>` primitive already shipped in N208 and is the building block here.

## Goal

1. Composer-first init done correctly across providers: **Claude** gets the composer flow (via `installFlow("composer-authoring")`, no default `task-*`); **Cursor** keeps a working flow (either default skills, or composer emission extended to Cursor).
2. Default flow opt-in: don't scaffold/promote it; keep it as the non-fatal `create` fallback; add a `create` hint + docs.
3. `install-flow default` documented as the "add the standard flow" path.

## Scope

### In scope
- `agents/init/index.ts` + `providers/*` — per-provider skill lists (Claude vs Cursor), so composer-first affects only the provider(s) that get the composer flow.
- `providers/skills.ts` — `buildSkillList` gains an include-builtins option (started in N208, reverted).
- `create.ts` — non-fatal install-flow hint on `default` fallback.
- Docs (getting-started + README).
- Update the byte-identical init baseline test + add composer-first init coverage.

### Out of scope
- The `install-flow` command (shipped in N208).
- Global / non-coder onboarding (N210).

## Implementation plan

1. Decide the Cursor story: (a) Cursor keeps the default skills (composer-first = Claude only), or (b) extend the flow-install emit to produce Cursor artifacts. Pick (a) for a first pass unless (b) is cheap.
2. Make init build **per-provider** skill lists so Claude drops builtins + installs composer while Cursor is unaffected.
3. Install `composer-authoring` for the Claude provider via `installFlow`.
4. Add the `create` hint + soft default (keep the `?? "default"` fallback).
5. Docs + regenerate the init baseline; add composer-first tests.

## Verification

- Fresh `insight-flow init --editor claude` → composer commands + `.mcp.json`, no default `task-*`.
- `insight-flow init --editor all` → Cursor still has a usable flow (no regression).
- `insight-flow create` still works (falls back to `default`) + prints the hint.
- Build + full test suite green (baseline updated).

## Notes

- Deferred from **N208** (which shipped `install-flow`). Merge into `agents-approved`.
