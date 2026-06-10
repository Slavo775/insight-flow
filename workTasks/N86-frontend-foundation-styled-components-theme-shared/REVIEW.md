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
