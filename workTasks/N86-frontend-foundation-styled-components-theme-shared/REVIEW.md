# N86 — Frontend foundation — styled-components theme + shared component library + Zustand store — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-10
**PR:** https://github.com/Slavo775/insight-flow/pull/61
**Verdict:** approved

## Summary

Frontend-foundation refactor of the N85 dashboard: a typed styled-components theme (single token source), a shared primitive library (`Button`/`Badge`/`Severity`/`Card`/`Chip`/`Text`/`Section`) adopted across the client, and a Zustand store that centralizes global state and removes prop-drilling. Strictly behavior-preserving — primitives reproduce the prior CSS values exactly, and `GlobalStyle` re-emits the `:root` vars from tokens so the un-componentizable parts (activity-feed string HTML, markdown-body) stay token-sourced. **Medium risk** — large surface and *no visual-regression test*, but verified behavior-preserving by gates + value-for-value review; the one residual risk is pixel parity, which needs a human eyeball.

## Checklist verification

- [x] `styled-components` + `zustand` added; `<ThemeProvider>` wraps the app — **pass**.
- [x] Typed theme tokens (colors/space/radius/font), `DefaultTheme` augmented in `theme.ts` — **pass**; token values match N85 verbatim.
- [x] Single color source-of-truth — **pass**; `taskStatusColor`/`eventColor`/`hookEventColor` read tokens; reviewer grep finds no hardcoded status/activity hex left in `lib.ts`/`activity.ts`.
- [x] Primitives implemented **and adopted** — **pass**; no leftover raw `<button>`/inline-badge/file-chip/heading/section (reviewer scan clean; the `act-tabs`/`doc-tabs` matches are kept *containers*, not migrated rules).
- [x] `styles.css` rules migrated (no orphaned/duplicated sources) — **pass**; CSS 13.8 → 10.5 KB; remainder is layout + activity string-HTML + markdown-body consuming the token-driven `:root`.
- [x] Zustand store holds global state; `useDashboardStream` feeds it; components select — **pass**; view-local state (popover/tab) correctly stays local.
- [x] Visually ≈identical, read-only/agent-driven preserved — **pass** on the code; **see Non-blocking #1** for the parity caveat.
- [~] Vitest — **deferred** (the spec's droppable item; acceptable, noted in CHECKLIST).
- [x] Gates: typecheck (CLI + client), lint, format, **87/87 tests** — **pass** (re-run independently).

## Non-blocking

1. **No visual-regression coverage (the real residual risk).** This is a CSS→styled rewrite of the whole dashboard with no automated pixel check; `e2e-smoke` only asserts routes. Strongly recommend a human eyeball at `/` (the running `:6555`) before merge — Kanban/timeline/detail/activity/markdown/live-SSE. Not a code defect, but the thing most likely to hide a regression.
2. **Vitest deferred.** The store and primitives have no unit tests. Reasonable for this pass (droppable), but a good follow-up — the store's `applySnapshot`/dedupe and `Button`/`Badge` variants are cheap to cover.
3. **Bundle growth.** JS ~99 → 117 KB gz (styled-components ~12 KB + zustand ~1 KB). Expected and accepted in the analysis.
4. **Scope: utility/structural CSS retained.** `mono`/`muted`/`kv`/`item`/`commit`/`stat`/`column`/`nav` + the activity-feed provider/hook badges (built as `dangerouslySetInnerHTML` strings) intentionally stay CSS — they're not "shared components." Documented in CHECKLIST; agreed.
5. **Minor edge:** `Badge` for an empty fix-status (`""`) renders empty text with the default tone — matches the prior empty render; harmless.

## Security & edge cases

- No new endpoints or writes — read-only/agent-driven invariant preserved.
- `dangerouslySetInnerHTML` (activity feed) unchanged: all dynamic fields still `escHtml`-escaped; markdown still `rehype-sanitize`d. No XSS vector.
- styled-components v6 filters transient `$`-prefixed props (`$variant`/`$active`/`$tone`/`$level`), so they don't leak to the DOM.

## Notes

- Decided + sequenced via `/task-analyze` (styled-components over Preact/Tailwind/extend-CSS-vars; one cohesive task; refactor + light polish). Builds on N85 (merged).
- WIP marker on PR #61 can be dropped now that the task is `implemented`.
- Follow-up candidates: Vitest (#2); fuller typography migration (mono/muted utilities) if a stricter "no utility CSS" bar is wanted.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-10
**Verdict:** fix-needed

### Summary

Project Owner requested a structural change to the new component library: the single `components.tsx` should be split into per-component files rather than one big file.

### Blockers

1. **Split `packages/taskflow/src/dashboard/client/components.tsx` into multiple component files — no one big component file.** Owner verbatim: "packages/taskflow/src/dashboard/client/components.tsx split to multiple component no one big component". **Fix:** break `components.tsx` (currently holds Button, Badge/Severity, Card+CardId/CardTitle/CardMeta, Chip, Text, Section) into one file per component/group (e.g. a `components/` folder: `Button.tsx`, `Badge.tsx`, `Card.tsx`, `Chip.tsx`, `Text.tsx`, `Section.tsx`, with a barrel `index.ts`), update imports across `App`/`ui`/`DetailPanel`, keep behavior identical. Gates must stay green. — ✅ **Resolved** (`/task-review-fix`): `components.tsx` deleted; created `components/{Button,Badge,Severity,Card,Chip,Text,Section}.tsx` + `index.ts` barrel; imports in `App`/`ui`/`DetailPanel` repointed to `./components/index.js`. Pure file-organization split — the built JS/CSS bundle hashes are byte-identical to before, typecheck/lint/format + 87 tests green.

### Notes

- Pure refactor (file organization) — no visual/behavior change intended.
- AI review (Round 1) approved; this human round supersedes with one structural blocker.


---

## Round 3 — AI re-review (post-fix)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-10
**Verdict:** approved

### Summary

Re-review of the Round-2 human blocker fix. `components.tsx` was split into a `components/` folder with one file per primitive (`Button` 82, `Badge` 32, `Severity` 19, `Card` 34, `Chip` 10, `Text` 26, `Section` 45 lines) + an `index.ts` barrel; `App`/`ui`/`DetailPanel` import from `./components/index.js`. Pure file-organization change.

### Checklist verification

- [x] **Blocker resolved** — no single big component file; `components.tsx` deleted; 7 single-purpose files + barrel. Verified on disk.
- [x] Imports repointed (`App`/`ui`/`DetailPanel` → `./components/index.js`); no stale `./components.js` import remains.
- [x] **Behavior preserved** — the built JS/CSS bundle hashes are **byte-identical** to pre-split (`index-CDvuSe6s.js` / `index-CuRUuCKU.css`), conclusively proving zero behavior/visual change.
- [x] Gates: typecheck (CLI + client), lint, format, **87/87 tests** — re-run independently, green.

### Blockers

None — the Round-2 blocker is fully resolved.

### Non-blocking

- Carried over from Round 1 (still non-blocking): visual-regression coverage is absent (human eyeball at `/` recommended before merge); Vitest deferred. The split itself adds no new concerns.

### Notes

- Round history: R1 AI = approved · R2 Human = fix-needed (split file) · **R3 AI = approved** (fix verified).
- Ready to merge once the human is satisfied with the on-screen parity.
