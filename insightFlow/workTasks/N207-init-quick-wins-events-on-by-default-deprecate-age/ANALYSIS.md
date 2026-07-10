# N207 — Init quick wins — events on by default, deprecate agents.extend — Analysis

**Created:** 2026-07-09
**Author:** task-analyze

## Problem framing

A review of the `insight-flow init` onboarding surfaced several changes. The human split them (see below); **this task (A) is the safe quick-wins subset**. Two concrete gaps:

1. **Events are off in fresh projects.** The library config default is `activityEngine.enabled: true`, but `init` scaffolds `activityEngine.enabled: false` (`agents/init/index.ts:76`). So a newly-initialised project shows only task-status transitions, not the full activity stream. Cause: init's hard-coded config template disables it.
2. **`agents.extend` is being retired.** The stack-specific-command mechanism (`agents.extend` in `taskflow.config.json`, applied by `applyAgentExtensions`, `init/index.ts:198`) is to be **deprecated now, removed later**. Today init actively *promotes* it — `buildConfigWithExamples` writes commented `agents.extend` stubs (`init/index.ts:435`) and the docs present it as the way to add project commands.

## Goal

1. New projects have the **activity engine ON by default** (full events), matching the library default.
2. **`agents.extend` is clearly deprecated** — non-breaking (still works), but init stops promoting it and the docs mark it for removal.
3. Docs reflect both.

## Scope boundary (this is Task A of 3)

- **In (Task A):** the two config/docs changes above.
- **Out (Task B, later):** the onboarding shift — install the composer flow on init, stop auto-setting the `default` flow, "install a flow / build your own" first-run, and its docs.
- **Out (Spike C, later):** global / non-coder feasibility (can `insight-flow` run project-less to a dashboard?).

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — flip the init config default + deprecate-in-place (keep `agents.extend` working) | Safe, non-breaking; immediate DX win; docs honest | none material | Low |
| B — remove `agents.extend` now | Cleaner | Breaking for existing consumers; the human said "removed soon", not now | Low-Med |
| C — leave init writing `enabled: false`, only document how to turn it on | No code change | Doesn't fix the default the human flagged | Trivial |

## Decision

- **Chosen option: A** (confirmed by the human — "split: quick wins first"). Flip the init default to `enabled: true`; deprecate `agents.extend` non-breakingly (stop scaffolding stubs / add a deprecation note + docs; optionally a one-line runtime warning when a config still uses it). Keep it functional until a later removal task.
- Rationale: both are low-risk, high-value onboarding fixes; deprecation-in-place avoids breaking existing consumers while steering them off `agents.extend`.

## Open questions

- `[non-blocking]` Runtime warning: emit a single deprecation warning when `applyAgentExtensions` runs on a config that has `agents.extend`? Nice steer, but keep it to one line and non-fatal. Implementer's call.
- `[non-blocking]` The `--examples` flag currently *only* produced the `agents.extend` stubs; once deprecated, `--examples` either scaffolds nothing (and should say so) or is left as a no-op with a note. Implementer to pick the cleaner of the two.

## Sources

- None — self-contained. Grounded in this repo's source: `agents/init/index.ts` (the `enabled: false` template + `buildConfigWithExamples` + `applyAgentExtensions`), `core/config.ts` (`ACTIVITY_DEFAULTS.enabled: true`), `website/docs/configuration.md`, `packages/taskflow/README.md`, root `CLAUDE.md` (documents `agents.extend`).

## Handoff brief

Title: *Init quick wins — events on by default, deprecate agents.extend*. Type: feat. Priority: medium. Tags: init, config, dx. Scope: In `agents/init/index.ts`, scaffold `activityEngine.enabled: true` (so new projects get full events, matching the library default and installing the activity hooks). Deprecate `agents.extend` non-breakingly — stop scaffolding the commented stubs (replace with a deprecation note), keep it working, and add a deprecation notice + the events-on-by-default note to the docs (`configuration.md`, README, `CLAUDE.md`). No onboarding/flow-install change (that's Task B); no global work (Spike C).
