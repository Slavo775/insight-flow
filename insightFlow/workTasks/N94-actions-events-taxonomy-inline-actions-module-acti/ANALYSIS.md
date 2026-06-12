# N94 — Actions/events taxonomy — inline actions module + activity hooks via emitter — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

The human's insight (verbatim): *"events module should be actions module and event module should be the set of hooks what we have now in .claude with logging events. so action is provided by AI model itself events is provided by hooks"* — validated against the codebase: `AGENT_EVENTS.md` (the `events` include) instructs the **model** to call `insight-flow log-event` (deliberate, fallible), while the 7 `.claude/hooks/lifecycle-*.sh` scripts emit telemetry **automatically** (harness, reliable). The naming conflates them; additionally the hooks have a pre-N92 bespoke installer that now competes with the emitter's managed manifest. Follow-up human decision: the model-side contract should be a **module only** — no `AGENT_*.md` file at all (which also dissolves the "is it agent's events?" naming problem) — and hook installation should **actually migrate** to the N92 emitter (not catalogue-only).

## Goal

- Taxonomy: `actions` = model-initiated reporting (inline section module); `events` = harness-observed telemetry (`activity/…` hook modules).
- One install mechanism for hooks (the emitter); the bespoke installer retired.
- Consumer opt-out (`activityEngine.phaseMarkers: false`) preserved.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Registry-id rename only (`events`→`actions`, file stays) | Cheapest | Module named `actions` pointing at AGENT_EVENTS.md — the confusion survives | S |
| B — Rename file too (AGENT_ACTIONS.md or MODULE_ACTIONS.md) | Names align | Still a file; still an arbitrary prefix; consumer include-migration for a cosmetic win | M |
| C — Inline as section module, delete the file (chosen, "module only") | No file, no naming debate; content lives where every other prompt block lives; one less scaffolded artifact | The phaseMarkers:false opt-out relied on blanking the file — must move to marked-block stripping in role files | M |
| D — Hooks catalogue-only (registry metadata, bespoke installer stays) | Smaller than migration | Two competing writers of settings.json hooks remain; rejected by human ("actually migrate") | S |

## Decision

- Chosen: **C + full installer migration** (human, 2026-06-11: "full rename but AGENT_EVENTS … it should be module only" + "actually migrate installation to the N92 emitter").
- Rationale: C is only viable because the marker comments can live inside the module body and render into the generated role files — giving init a patchable block (same pattern as `agents.extend`) that replaces the blank-the-file lever. The installer migration removes the last bespoke writer of `.claude/settings.json`, leaving the N92 managed manifest as the single mechanism (one writer = the cross-agent guarantees from the N92 fix cycle hold globally).

## Open questions

- [non-blocking] Hook-script schema shape: hook modules carrying `script: { name, content }` (emitter writes `.claude/hooks/<name>` 0755) vs a sibling `script` kind. Implementer decides; carrying-on-hook assumed in the spec.
- [non-blocking] How the activity group is adopted: a built-in `activity` composed def vs documented project-local `--def`. Spec leans documented def; whichever, the install must be reachable from `init`.
- [non-blocking] `stripPhaseMarkers` semantics: remove block inclusive of markers vs blank between markers (re-strippable). Test whichever is chosen.
- [non-blocking] Legacy consumers with `@AGENT_EVENTS.md` lines in old role files: tolerate (missing-file include resolves empty in Claude Code) and document, or actively patch on upgrade.

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, read from repo 2026-06-11, trust: high):
- `AGENT_EVENTS.md` (root) — current content incl. `taskflow:phase-markers` markers; the `actions` module body source.
- `playground/.claude/hooks/` — the 7 lifecycle scripts becoming `activity/…` modules.
- `packages/taskflow/src/agents/init/index.ts` — `stripPhaseMarkers` (blanks AGENT_EVENTS.md when `phaseMarkers: false`): the opt-out constraint that shaped option C.
- `packages/taskflow/src/agents/activity-hook.ts` — bespoke installer (`BUNDLED_HOOKS_VERSION`, `detectActivityHookStatus`) to retire.
- `packages/taskflow/src/agents/emit.ts` — the N92 managed-manifest emitter taking over installation.

## Handoff brief

> Title: Actions/events taxonomy — inline actions module + activity hooks via emitter · Type: rework · Priority: medium · Tags: agents, composer, hooks, activity.
> Part A: replace the `events` include + AGENT_EVENTS.md with an inline `actions` section module (markers inside the body; opt-out becomes marked-block stripping in init); regenerate the 9 role files. Part B: the 7 lifecycle logging hooks become `activity/…` hook-kind modules installed via the N92 emitter; the bespoke installer in activity-hook.ts retires; hookStatus detection goes manifest-based. Out of scope: renaming other partials, new telemetry, UI changes.
