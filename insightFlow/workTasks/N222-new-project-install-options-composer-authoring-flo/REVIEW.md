# N222 — New Project install options + composer-authoring flow install — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-12
**PR:** (no PR yet — branch `feat/N222-new-project-install-options`)
**Verdict:** fix-needed

## Summary

The wiring is clean and the flow→disk investigation landed on the right entry point (`installFlow`). **Security is clean** (independently verified): `installFlows` is double-gated to `composer-authoring`, `editor` is validated, the `.mcp.json` command is fixed, and all N221 guards (loopback, `isTrustedLocalRequest`, realpath confinement) still run before any option is used. Two **Medium correctness/UX issues** on the headline feature: a failed composer-flow install is silently swallowed (endpoint still reports success), and the modal offers options that silently no-op for a `cursor` project. REQUEST CHANGES for those; the rest are non-blocking. Risk: low-medium (feature-correctness, not security).

## Checklist verification

- [x] Flow→disk path found + documented (`installFlow(id, cwd)`) — pass
- [x] `initProject` accepts `activity?`/`lifecycle?`/`installFlows?` — pass
- [x] `installFlows: ["composer-authoring"]` installs authoring commands/agents/mcp — pass (init + endpoint tests)
- [x] `create` parses + forwards options — pass (guards run first; editor/installFlows validated)
- [x] Defaults unchanged when options omitted — pass (verified; existing init tests hold)
- [x] Modal exposes the options — pass
- [~] "activity off / editor cursor reflect choices" — **partial** (see Blocker 2: cursor selections don't apply)
- [x] typecheck / eslint / tests (349, +4) — pass

## Blockers

1. **A failed composer-flow install is silently swallowed — the endpoint still reports success.**
   `init/index.ts:346–351` — step-6c wraps `installFlow(flowId, cwd)` in a `try/catch` that only `console.error`s and continues; `initProject` returns void, so a throw (partial `.claude/`/`.mcp.json` write, template/emit failure, `.mcp.json` conflict) never reaches the create handler's try (`server.ts:855`). The endpoint returns `200 {path}` and the modal shows "Created at …" + reloads (`overview.ts`), even though the flow the user explicitly ticked is missing/half-written.
   **Fix:** surface flow-install failures to the caller — e.g. `initProject` collects failed flow ids and the create response returns a `warnings`/`flowErrors` field the modal shows (or, minimally, the modal notes "project created, but the composer flow failed to install"). Don't report unqualified success when a requested flow didn't install.

2. **`editor: cursor` (or "Both") silently no-ops the lifecycle/activity checkboxes and writes dead `.claude/` composer artifacts.**
   `init/index.ts` — the lifecycle/activity enable block is gated on `claudeSelected`, but step-6c (`:341`) runs regardless of editor; the modal (`overview.ts`) offers Composer / Lifecycle / Activity for any editor. So a user who picks Cursor + ticks those gets: no lifecycle/activity (silently), and composer commands written to `.claude/commands/` that a Cursor project doesn't read.
   **Fix:** make the modal honest — when `editor === "cursor"`, disable/hide the Lifecycle, Activity, and Composer-authoring options (they're Claude-shaped), or show an inline note; and/or have step-6c warn/skip when `!claudeSelected`. User selections must not silently fail to apply.

## Non-blocking

1. **Unchecking Activity still writes `activityEngine.enabled: true` to the new config** (`init/index.ts` base-config template) — the hook is correctly skipped, but the on-disk config claims enabled, so a later `insight-flow init` re-run sees `activityAlreadyConfigured` and re-installs the hook, reversing the user's "off". Pre-existing (not a regression), but now user-facing via the checkbox. Follow-up: persist `enabled: false` when `activity === false`.
2. **Explicit `lifecycle`/`activity` don't override on a re-init against an existing project** (`already-installed/configured` branch wins). Harmless for the fresh-create modal path; the code comment "override the interactive/default answers" is slightly overstated.
3. **Step-6c only accepts built-in ids** (`isBuiltinProjectId`), unlike the `install-flow` CLI command which also installs user-registry flows. Fine for N222's scope; noting the divergence.
4. **`installFlows` not deduped** (`server.ts` filter) — a trusted caller could send N copies → N idempotent installFlow passes. Trivial local self-amplification (already same-origin-gated). Optional: `[...new Set(installFlows)]`.

## Security & edge cases

Independently verified: **no findings.** `installFlows` double-gated (server filter `=== "composer-authoring"` + `isBuiltinProjectId`), never used as a path; `editor` double-validated; `.mcp.json` command/args fixed (`substituteVars` fills nothing from request input on a fresh project); all N221 create-endpoint guards run before any option is read or any write happens; flow artifacts stay under the realpath-confined project dir.

## Notes

- Field-id wiring (`np-*`), the `composer-authoring` id match (server filter ↔ `AUTHORING_PROJECT.id` ↔ `isBuiltinProjectId`), the `x===undefined?undefined:x===true` threading, editor fallback, and step-6c placement (after providers) were all verified correct.
- Both blockers are about surfacing/consistency, localized to `init/index.ts` step-6c + the modal (`overview.ts`) + the create response (`server.ts`).
- Next: `/task-review-fix`, then re-review. After N222 lands, the whole `dashboard-improvements` branch is ready for `main` + the 2.4.0 release.

---

## Fixes applied (task-review-fix, 2026-07-12) — "Fix review"

**Blocker 1 — silent flow-install failure → FIXED.** `initProject` now returns `{ flowErrors: {id,error}[] }`; step-6c records any failed (or unknown) flow instead of only logging. `POST /api/projects/create` captures it and returns a `warnings` array; the modal shows "Created at … — Flow \"x\" did not install: …" (error style, longer read time) instead of an unqualified success. Tests: unknown-flow → `flowErrors`; a clean endpoint create → `warnings: []`.

**Blocker 2 — cursor selections silently no-op → FIXED.** The modal now disables + unchecks Lifecycle, Activity, and Composer-authoring when `editor === "cursor"` (they're Claude-shaped), with an inline note ("…are Claude-only"); `npEditorChanged()` runs on the select's `onchange` and on modal open. "Both" keeps them enabled (Claude is present).

**Non-blocking → fixed where safe.**
1. `activity: false` (explicit, from the modal) now persists `activityEngine.enabled: false` to the new config, so a later `init` re-run doesn't re-enable the hook. Narrow to the explicit-off case → plain `insight-flow init` is unchanged. Test added.
4. `installFlows` deduped (`[...new Set(...)]`) in step-6c.
- Unknown flow ids are now reported (via `flowErrors`) rather than silently skipped.
- (nb2 re-init precedence / nb3 built-in-only scope) — left as noted; nb2 is harmless for the fresh-create path and nb3 is intentional for N222's scope.

**Gates:** typecheck clean, eslint clean, `npm test` → **349** (strengthened assertions: `flowErrors` return, config persist, `warnings`). Cursor guard confirmed bundled. Security posture unchanged (verified clean in Round 1).

**Verdict after fixes:** ready for re-review.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-12
**Verdict:** approved

### Summary

Both Round-1 blockers and the non-blocking fixes are verified resolved (independent correctness pass); the `initProject` return-type change is safe for all callers and no new functional bugs were introduced. One **LOW UX** item surfaced (cursor→claude toggle dropped the default checkbox state, and options persisted across modal reopen) — fixed in this round. Clean. APPROVE.

### Checklist verification

- [x] **Blocker 1 (silent flow-install failure) resolved** — `initProject` returns `{ flowErrors }` (all 3 exit paths return it); step-6c records failures + dedupes; the create endpoint returns a `warnings[]`; the modal shows it (falls through to plain success when empty). Callers safe (`cli.ts` ignores the return; endpoint uses it).
- [x] **Blocker 2 (cursor silent no-op) resolved** — modal disables + unchecks Lifecycle/Activity/Composer for `editor:cursor` with a note; `npEditorChanged` wired to `onchange` + open.
- [x] Non-blocking: `activity:false` persists `enabled:false` (correct placement, narrow to explicit-off, plain init unchanged); `installFlows` deduped; unknown ids reported.
- [x] typecheck / eslint / tests → **349** pass.
- [x] Security posture unchanged (verified clean in Round 1; fixes don't touch the guard path).

### Blockers

None.

### Non-blocking

None outstanding. (The LOW item below was found and fixed this round.)

### Security & edge cases

- **Found + fixed this round (LOW UX):** `npEditorChanged` re-enabled the guarded checkboxes on cursor→claude but didn't restore their `checked` state, so a brief Cursor selection dropped the default-checked Lifecycle; and `createProject` didn't reset the option fields on reopen. Fixed: `npEditorChanged` now saves/restores each box's state across the toggle (via `data-prev`), and `createProject` resets all options (lifecycle on, activity/composer off, registerhub on, editor claude) on every open. Bundled + verified.
- Residual (informational, not fixed — pre-existing): a cursor project's on-disk config keeps the template `activityEngine.enabled:true` (the NB1 persist is inside the `claudeSelected` block); a later `init --editor claude` on it could re-enable. Edge case, not a regression.

### Notes

- Independent correctness verification confirmed: every `initProject` path returns the object; the create try/catch is intact (the earlier duplicate-`try` is gone); `warnings` always an array; the modal warning/ success/disabled flows are correct; NB1 placement is right and doesn't change plain `init`.
- Next (gated): human review, then `/task-git`. After N222 lands, `dashboard-improvements` is ready for `main` + the 2.4.0 release.


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-12
**Verdict:** approved

### Notes

> Okej I approved it merge to base

Approved. Merge N222 into the base branch `dashboard-improvements` (final task of the N219–N222 epic).

### Security & edge cases

### Notes
