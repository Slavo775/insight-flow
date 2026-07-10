# N207 — Init quick wins — events on by default, deprecate agents.extend

**Type:** feat
**Priority:** medium
**Created:** 2026-07-09

## Problem

`insight-flow init` scaffolds `activityEngine.enabled: false` (`agents/init/index.ts:76`) even though the library default is `true` — so new projects show only task-status transitions, not the full activity stream. Separately, `agents.extend` (the stack-command mechanism) is being retired, but init still actively promotes it (scaffolds commented stubs via `buildConfigWithExamples`) and the docs present it as the recommended way to add project commands. This is Task A (quick wins) of a 3-part init review; see `ANALYSIS.md`.

## Goal

1. New projects get the **activity engine ON by default** (full events; the activity hooks install), matching the library default.
2. **`agents.extend` deprecated non-breakingly** — still works, but init stops promoting it and it's marked for removal.
3. Docs reflect both changes.

## Scope

### In scope

- `packages/taskflow/src/agents/init/index.ts` — scaffold `activityEngine.enabled: true`; change `buildConfigWithExamples` so it no longer promotes `agents.extend` (replace the stub with a deprecation note, or make `--examples` a documented no-op); optionally emit a one-line deprecation warning in/next to `applyAgentExtensions` when a loaded config still has `agents.extend`.
- `website/docs/configuration.md` — events on by default; `agents.extend` marked **deprecated (removed in a future release)**.
- `packages/taskflow/README.md` and root `CLAUDE.md` — same deprecation note on the `agents.extend` sections; note events-on-by-default.

### Out of scope

- **Removing** `agents.extend` (later task) — it must keep working.
- The onboarding / flow-install shift (composer-only init, default flow not default) — **Task B**.
- Global / non-coder feasibility — **Spike C**.
- The activity engine's own behaviour (only the init default flips).

## Implementation plan

1. **Events on by default.** In `agents/init/index.ts` (~L76), change the scaffolded config to `activityEngine: { enabled: true, logFile: ".taskflow-activity.jsonl", maxEvents: 200 }`. init already gates hook install on `enabled !== false` (~L258), so activity/lifecycle hooks now install by default. Confirm an existing on-disk config is still respected (the `configExisted` branch must not force-flip a user's explicit `false`).
2. **Deprecate `agents.extend` in init.** In `buildConfigWithExamples` (~L435): stop emitting the `agents.extend` stub as a recommended template — replace the `"// extend"` comment block with a short **"agents.extend is deprecated and will be removed — do not use for new projects"** note (or drop the stub and have `--examples` print/emit that note). Keep `applyAgentExtensions` intact so existing configs still work; optionally `console.warn` once when it runs on a config containing `agents.extend`.
3. **Docs.** Update `configuration.md`, `packages/taskflow/README.md`, and `CLAUDE.md`: (a) activity engine is **on by default** in new projects; (b) `agents.extend` is **deprecated** (still functional, slated for removal) — stop presenting it as the recommended path.

## Verification

- `pnpm --dir packages/taskflow run build` ✅ and `pnpm --dir packages/taskflow test` ✅ (init integration tests still pass; adjust any that assert `enabled: false`).
- Run `insight-flow init` in a throwaway dir → the written `taskflow.config.json` has `activityEngine.enabled: true` and **no** promoted `agents.extend` stub (a deprecation note instead).
- `insight-flow init --examples` no longer scaffolds `agents.extend` as a template (or clearly marks it deprecated).
- An existing config with `activityEngine.enabled: false` is **not** overwritten by re-init.
- A config that still has `agents.extend` continues to apply the extensions (non-breaking); deprecation note/warning present.
- Docs show events-on-by-default and the `agents.extend` deprecation.

## Notes

- Task A of 3 from the init review. **Task B** (onboarding: composer flow installed on init, `default` flow no longer auto-set, "install a flow or build your own" first-run + docs) and **Spike C** (global / non-coder feasibility) are separate follow-ups — do not start them here.
- Non-breaking by design: `agents.extend` keeps working until a dedicated removal task.
- Merge into `agents-approved`, like the recent series.
