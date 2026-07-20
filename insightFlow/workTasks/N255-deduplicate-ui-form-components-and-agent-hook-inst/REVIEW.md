# N255 — Deduplicate UI form components and agent hook installers; activity.ts to JSX — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-20
**PR:** (no PR yet — reviewed working tree)
**Verdict:** fix-needed → fixed (Round 1)

## Round 1 — fixes applied

- **Blocker 1 (AgentForm import): FIXED.** Added `import { Field, FieldError, TopError, FormActions, PickerRow, OrderedRow, RowTitle, RowButton } from "./components/form.js";` to `AgentForm.tsx`. `pnpm typecheck` (CLI + client) now clean (0 errors, was 40). `/agent/new` renders the full form live — no error boundary, no console errors.
- **Non-blocking 1 (context-compacted icon): FIXED.** `ActivityItem.tsx:80` `"⌿"` → `"↯"` (U+21AF), matching the original `&#8623;`.
- **Non-blocking 2 (`/log/events` stream-error 500): NOT changed** — reviewer deemed it acceptable (fires only on a broken socket where the client can't read a reply); restoring it isn't a clean <1-line fix (the shared `readBody` conflates overflow-413 with stream-error). Left as-is by design.
- Gates re-run with the CORRECT command this time: `pnpm typecheck` ✅ · build ✅ · eslint ✅ · 374 tests ✅.

## Summary

Form dedup, `minutesBetween`, the `activity.ts`→JSX (XSS-surface removal), and the `emit.ts removeOwnedHook` extraction are all correct and type-clean. **But `AgentForm.tsx` is broken**: the extraction deleted its 8 local styled-components without adding the shared import, so `Field`/`FieldError`/`TopError`/`FormActions`/`PickerRow`/`OrderedRow`/`RowTitle`/`RowButton` are undefined. Confirmed as a runtime crash. One BLOCKER + one LOW nit.

## Checklist verification

- [x] `components/form.ts` created; ModuleForm + ProjectForm import correctly — pass
- [ ] AgentForm imports shared components — **FAIL** (missing import, see Blocker 1)
- [x] `minutesBetween` replaces both DetailPanel duration calcs — pass
- [x] `activity.ts`→JSX; no `dangerouslySetInnerHTML`; `escHtml` deleted — pass (icon nit below)
- [x] `emit.ts removeOwnedHook` — behavior-identical to both inlined copies — pass
- [x] Correctly LEFT the 4 differing components + MapBox + bash preludes — pass

## Blockers

1. **`AgentForm.tsx` — 8 undefined identifiers → build/runtime crash.** The N255 extraction removed AgentForm's local `Field`, `FieldError`, `TopError`, `FormActions`, `PickerRow`, `OrderedRow`, `RowTitle`, `RowButton` but never added the `import … from "./components/form.js"` line (the import-add regex matched `import styled from …` but AgentForm's line is `import styled, { useTheme } from …`, so it was silently skipped). All 8 are still referenced (40 `TS2304`/`TS2552` errors, e.g. lines 228, 230, 263, 281, 356).
   - **Why it slipped past the implementer's gates:** `npx tsc --noEmit` excludes `src/dashboard/client` (root `tsconfig.json` `exclude`); `pnpm build` (tsup/vite → esbuild) transpiles without type-checking. The correct gate is `pnpm typecheck` (runs the client tsconfig too).
   - **Failure:** navigating to `/agent/new` renders the error boundary — console: `ReferenceError: Field is not defined`. Confirmed live.
   - **Fix:** add to `AgentForm.tsx` after the `styled` import:
     `import { Field, FieldError, TopError, FormActions, PickerRow, OrderedRow, RowTitle, RowButton } from "./components/form.js";`
     Then verify with `pnpm typecheck` (not `npx tsc --noEmit`).

## Non-blocking

1. **`ActivityItem.tsx:80` — wrong glyph for `context-compacted`.** Original `hookEventHtml` used `&#8623;` (U+21AF `↯`); the JSX uses `"⌿"` (U+233F). Every other icon matches exactly. Fix: `"↯"`. (Rare event; cosmetic.)
2. `/log/events` (dashboard) lost its `req.on("error")` → `500 {error:"read failed"}` branch in the `readBody` swap; a mid-body socket error now resolves `null` → silent `return`. Only fires on a broken socket (client usually can't read a reply anyway) — acceptable, noted for completeness.

## Security & edge cases

The XSS goal is met: no `dangerouslySetInnerHTML` remains in the activity path; every event field renders as auto-escaped JSX (independent security review confirmed). No new security concerns.

## Notes

- Only AgentForm is broken; ModuleForm, ProjectForm, ActivityItem, form.ts, DetailPanel, lib.ts, ActivityFeed, emit.ts are all type-clean under the full `pnpm typecheck`.
- **Process note for the fixer and future UI work:** always run `pnpm typecheck` (CLI + client), not `npx tsc --noEmit`. `prepublishOnly` runs the full check, so this would have been caught before publish — but it should be caught in the dev loop.
- Related: [N253], [N254], [N256].


---

## Round 3 — re-review after fix

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-20
**Verdict:** approved

### Summary

Blocker resolved and both nits addressed. Re-verified independently against the correct gate (`pnpm typecheck`, CLI + client): **0 errors** (was 40), 374 tests pass.

### Checklist verification

- [x] AgentForm imports shared components — **now PASS** (`AgentForm.tsx:8-17` imports all 8 from `./components/form.js`; the whole form type-checks and renders)
- [x] `context-compacted` icon — **now PASS** (`ActivityItem.tsx:80` = `"↯"` U+21AF, matches original `&#8623;`)
- [x] (N254 nit applied) `master/server.ts:919` = `sendJson(res, 200, {...})`; zero bare `"application/json"` remain
- [x] All prior-passing items still pass (form.ts, ModuleForm, ProjectForm, activity JSX, minutesBetween, removeOwnedHook)

### Blockers

None. Blocker 1 fixed.

### Non-blocking

- `/log/events` stream-error 500 branch left off by design (broken-socket only; not a clean fix). Accepted.

### Security & edge cases

No change from Round 1 — XSS goal met, no new concerns.

### Notes

- Live-verified in the prior fix cycle: `/agent/new` renders the full AgentForm (shared `Field`/`PickerRow`/`FormActions` resolve), zero console errors.
- N255 is now ready for human review / merge alongside the already-approved [N253], [N254], [N256].
