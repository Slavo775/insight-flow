# N140 — Analysis (Pre-Taskmaster)

## Problem framing

The N139 doubled-path bug existed because the same path-resolution logic lives in two
places — `core/storage.ts:152` `resolveTaskFolder(cwd, config, task)` and
`core/spec.ts:12` `resolveTaskFolder(config, task, cwd?)` — with *different argument
orders*. They drifted once (the `spec.ts` copy used `replace(/^.*?\//, "")`, the
`storage.ts` copy used the basename), which silently produced
`insightFlow/workTasks/workTasks/Nxx` under the N101 layout. N139 fixed the symptom by
copying the basename logic into `spec.ts`, leaving two identical-but-separate functions
that can diverge again.

## Goal

One shared resolver in `core/`, single signature, both call-site groups routed through
it, zero behavior change, with the N139 regression test pinned to the shared function.

## Options considered

1. **Leave as-is** — two copies, now identical. Rejected: this is exactly the state that
   produced a high-priority silent bug; nothing prevents re-divergence.
2. **Unify into one shared resolver in core (chosen).** ~20-line pure refactor; both
   copies already share basename logic so it's behavior-preserving. Canonical signature
   `(config, task, cwd?)` matches `spec.ts`, so only `storage.ts`'s 4 call sites change
   arg order.
3. **Add a lint rule / comment forbidding duplication** — weaker; doesn't remove the
   duplication, just discourages it.

## Decision

Option 2. Split out from the stray-dir cleanup (N141) because this is a trivially-safe
refactor and N141 is a destructive migration — different risk profiles should not share a
review.

## Open questions

- Exact home for the shared function: `core/paths.ts` (next to `getWorkDir`) is the
  natural candidate; implementer confirms against current core layout.
- Whether to also export it from `index.ts` (only if a consumer needs it; default no).

## Sources

- `insightFlow/workTasks/N139-fix-doubled-task-folder-path-in-spec-ts-resolvetas/REVIEW.md`
  (non-blocking follow-up #1; Notes "follow-up candidate").
- `core/storage.ts` + `core/spec.ts` (6 call sites, two signatures).

## Handoff brief

Type: rework · Priority: medium · Tags: core, tech-debt, refactor. Collapse the two
`resolveTaskFolder` copies into one shared core resolver; update the 6 call sites; extend
`test/spec-path.test.mjs`. Zero behavior change; done = build green, 230/230 suite,
typecheck/lint/format clean.
