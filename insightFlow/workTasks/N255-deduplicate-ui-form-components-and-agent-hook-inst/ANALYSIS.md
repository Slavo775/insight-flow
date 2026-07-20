# N255 — Deduplicate UI form components and agent hook installers; activity.ts to JSX — Analysis

**Created:** 2026-07-18
**Author:** task-analyze

## Problem framing

Three independent copy-paste clusters surfaced by the UI and agents scanners. They share a theme (duplication) but live in different subsystems, so this task is the "medium-risk dedup" bucket, deliberately kept separate from the zero-risk deletions (N253) and the two-server http-util refactor (N254). The highest-value item here isn't strictly dedup: converting `activity.ts` off `dangerouslySetInnerHTML` removes a manual-escape XSS surface in a React app — that's a safety win riding along with the cleanup.

## Goal

- Collapse the 3 form components' shared styled-components into one module.
- Collapse the notify/activity hook installers and their bash prelude.
- Replace hand-rolled escaped-HTML-string rendering with JSX (removes the XSS surface).

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — One task covering all three clusters | Related "dedup" theme; one review of the cleanup pass | Spans UI + agents; broader than a single subsystem | M |
| B — Split into 3 micro-tasks (forms / hooks / activity) | Each tiny and focused | Tracking overhead for changes that are individually small; the activity XSS fix shouldn't wait in a queue | S×3 |
| C — Fold into N254 | One PR | N254 is already behavior-heavy; adding UI + hooks would bloat its blast radius | — |

## Decision

- Chosen option: **A**
- Rationale: the three clusters are each too small to justify their own task but share the "delete duplication" intent and the same quality gates. Keeping them together (not in N254) preserves N254's reviewability while giving the activity.ts XSS fix a definite home. If the implementer finds the activity conversion large, it can be split out — but default is one task.

## Open questions

- `[non-blocking]` Can the `notify`/`activity` hook installers actually route through `emit.ts applyHooks`, or do their per-hook specifics (Stop vs PostToolUse, script names) resist full unification? If unification is forced/awkward, share only the genuinely-common helpers (`settingsRegistersHook`, `hookFilePath`, prelude) — don't invent an abstraction for its own sake.
- `[non-blocking]` If N254 lands first and exposes a shared `escHtml`, the client should reuse it rather than keep its own — but activity.ts should be JSX regardless, so `escHtml` mostly disappears there anyway.
- `[non-blocking]` Confirm the activity feed's event-type coverage so the JSX conversion renders each type identically (screenshot compare).

## Sources

- None — discussion was self-contained. Findings from the in-repo ponytail audit (UI + agents scanners), 2026-07-18.

## Handoff brief

Deduplicate UI form components and agent hook installers; convert activity.ts to JSX. type: refactor, priority: medium, tags: refactor, dedup, ui. Extract the ~12 shared form styled-components into `client/components/form.ts` (ModuleForm/AgentForm/ProjectForm), plus `MapBox` and a `minutesBetween` helper; convert `activity.ts`'s HTML-string rendering to JSX and drop `dangerouslySetInnerHTML` (removes an XSS surface); collapse the `notify-hook`/`activity-hook` settings.json registration duplication (ideally onto `emit.ts applyHooks`) and share the copy-pasted bash prelude. Verify forms + activity feed render identically and hook install/uninstall stays correct.
