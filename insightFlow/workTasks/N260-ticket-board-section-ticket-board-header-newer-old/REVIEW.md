# N260 — Ticket Board section (TICKET BOARD header + Newer/Older shard pagination + colored Kanban) — Review

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-23
**PR:** (no PR yet)
**Verdict:** fix-needed

## Round 1 — AI pass

### Summary

Clean, reuse-heavy rework. The header (`ShardNav`), the bordered board, the `ScrollShadow` reuse, status-colored column headers, and the colored-left-border 2-line ticket cards all render correctly (verified in-browser). Reuse is good; only `ArrowRightIcon` + `statusHeaderColor` are new. **However**, the a11y pass found a real keyboard blocker: the ticket cards are click-only `<div>`s, and N260's hidden-scrollbar horizontal board turns that latent issue into a keyboard trap — off-screen columns/cards become unreachable without a mouse. That is the one thing to fix. The rest is minor (custom-flow color fallback, count-badge contrast) or nits.

### Checklist verification

- [x] `ArrowRightIcon` + `statusHeaderColor` added — pass
- [x] ShardNav → header row (title + Newer/chip/Older, disabled edges, onSelect preserved) — pass
- [x] Kanban → bordered board with `ScrollShadow` + status-colored headers + tinted counts — pass (renders; edge fade verified)
- [x] TaskCard → status-colored left border (kept on hover) + 2-line clamp — pass visually
- [x] CSS cleanup (`.kanban` overflow removed, `.shard-nav` header, `.shard-nav span` removed) — pass
- [~] Board usable by everyone — **fails keyboard access** (see Blocker 1); mouse works

### Blockers

1. **Board is a keyboard trap — ticket cards are not keyboard-operable, and the hidden-scrollbar board hides them off-screen.** (`ui.tsx` `AccentCard`/`TaskCard` ~208-215; the card is `styled(Card)` = `styled.div` with `onClick`, no `role`/`tabIndex`/key handler — `components/Card.tsx:3`.)
   - **Why:** the ticket card opens a task (an action) but is a click-only `<div>` — not in the tab order, no button role. This is a **pre-existing** dashboard pattern, but N260 makes it load-bearing: it replaced the visible-scrollbar board with `ScrollShadow` (`scrollbar-width:none`, no scrollbar, no `tabIndex`/`role`). So when columns overflow, a keyboard-only user can neither reach the cards nor scroll to the right-hand columns (WCAG 2.1.1). The hidden scrollbar also removes the mouse-free visual affordance.
   - **Fix (contained, resolves both keyboard findings):** make the **ticket card** keyboard-operable — on `AccentCard`/`TaskCard`, add `role="button"` + `tabIndex={0}` + an `onKeyDown` that fires `onOpen` on Enter/Space (mirror how other interactive cards do it), or render the card as a real `<button>`. Focusable cards are in the tab order, expose a button role, and — crucially — focusing an off-screen card auto-scrolls the `ScrollShadow` strip into view, restoring keyboard scroll of the board. (Optional hardening: also give the board `ScrollShadow` strip `tabIndex={0}` + `role="group"`/`aria-label` so even empty-column regions are keyboard-scrollable; note `ScrollShadow` is shared with the N258 header, so gate this behind a prop rather than changing it globally.)
   - Note: this is pre-existing app-wide (every Kanban card was a click-only div). It is legitimately in N260's scope because N260's hidden-scrollbar board is what turns it into a hard trap. If you prefer, it can be split into a dedicated "make task cards keyboard-accessible" task — human's call at the gate.

### Non-blocking (recommended in the same fix pass — cheap)

2. **`BoardFrame` declared after use** (`ui.tsx`: referenced in `Kanban` ~247, `const BoardFrame` declared ~285). Runtime-safe, but may trip `@typescript-eslint/no-use-before-define` at the pre-commit hook. **Fix:** move `const BoardFrame` above the `Kanban` function.
3. **Count-badge contrast (small text).** `.column-count` uses the status color as text over `rgba(color,0.18)` — purple ≈3.8:1 and red ≈4.05:1 fail AA for 11px small text (slate/amber/green pass). **Fix:** use `--text` for the numeral (keep the tint as background), or bump the tint alpha for the darker hues. (Header *labels* all pass AA — no color-only issue, text is present.)

### Non-blocking (optional / defer)

4. **Custom-flow columns/cards lose their flow color → muted.** `statusHeaderColor(col) = taskStatusColor(col.matches[0])` and the card border `taskStatusColor(task.status)` only know canonical `tokens.status`; a custom-flow status id → `#737373` (grey). Default flow (the shipped/common case) renders perfectly. Timeline does it right (`statusColor(id, flowStatuses) ?? taskStatusColor(...)`). **Optional fix:** plumb `statusMap`/flow statuses and prefer `statusColor` before the canonical fallback. Not a blocker; default-flow board is correct.
5. **"Page 0 of N" when `currentShard === null`** (pre-load) — `idx = -1`. Cosmetic; only shows if `ShardNav` mounts before a shard loads. Guard with `Math.max(1, idx+1)` if desired.
6. **Dropped shard-id range** (was "N00-N09", now "Page X of Y") — intentional per the Lovable design; task IDs still show on cards, so low impact. Flagged for the designer, not a defect.
7. **Nits:** `.column-header` still sets `color:var(--text-muted)` but both children carry inline color overrides (dead-but-harmless fallback); `ScrollShadow`'s edge mask fades the **full column height** on this tall board (cosmetic — the component was tuned for a short toolbar row); `overflow-y:hidden` could clip ~2px of a focused card's ring at a column's top/bottom (relevant once cards are focusable — a few px vertical padding on the Strip fixes it).

### Security & edge cases

None. Counts/colors are pure client-side over already-loaded tasks.

### Notes

- Verified in-browser (fresh repo build): header "TICKET BOARD · PAGE 1 OF 1" + Newer/1-1/Older (disabled at single page); bordered board; right edge fade on overflow (`true/false`); column colors correct (Ready slate, In Progress amber, Review purple, Fix red); card left border + clamp; 2 `ScrollShadow` strips coexist independently; no app console errors; tsc + build pass.
- `ScrollShadow` on the tall board does **not** vertically clip (Strip height is auto). The two `ScrollShadow` instances are independent (own ref/state/RO).
- `Kanban`/`ShardNav`/`Stats`/`Timeline` are only consumed by `App.tsx` — no other consumer to regress.
- **Context:** N258 + N259 approved but uncommitted; N260 stacks on them. Commit all at git time.

---

## Round 2 — AI re-review (after the fix pass)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-23
**Verdict:** ai-approved (clean)

### Summary

The Round-1 keyboard blocker is resolved and the cheap recommended items are done. The ticket card is now a real keyboard control; the count contrast passes; `BoardFrame` is declared before use (eslint clean); the pre-load page number is clamped. Verified in-browser. No blockers.

### Checklist verification

- [x] **Keyboard blocker fixed** — `AccentCard`/`TaskCard`: `role="button"` (ui.tsx:221), `tabIndex={0}` (222), `aria-label` (`{id}: {title}`), `onKeyDown` opening on Enter/Space (224), and a `:focus-visible` inset ring (187). Verified: focusing the card + Enter opens the detail panel; the card is tabbable; focusing an off-screen card scrolls the board into view (board now keyboard-reachable).
- [x] **Count contrast** — `.column-count` numeral now `color: var(--text)` (#e5e5e5) over the tinted status bg (ui.tsx:292). Passes AA at 11px.
- [x] **`BoardFrame` before use** — moved above `Kanban` (ui.tsx:245 before :253); `eslint` exit 0.
- [x] **Page clamp** — `const page = Math.max(1, idx + 1)` (ui.tsx:412); title + Chip use `page` (no "Page 0").
- [x] No regression — header/board/colors/edge-fade unchanged; tsc + build + eslint pass; no app console errors.

### Blockers

None.

### Non-blocking

Deferred (accepted for a follow-up, not this task):
- **Custom-flow columns/cards → muted color.** `statusHeaderColor`/card border use `taskStatusColor` (canonical only); a custom-flow status id falls back to grey. Default flow renders correctly. A `statusColor(id, flowStatuses)` plumb (like `Timeline`) is the fix when wanted.
- Nits from Round 1 (dead `.column-header` color fallback; full-height edge fade on the tall board; dropped shard-id range per design) — all optional, unchanged.

### Security & edge cases

None (client-side layout only).

### Notes

- The focus ring uses `outline-offset: -2px` (inset), so the board's `overflow-y:hidden` cannot clip it — the Round-1 nit is addressed.
- N258 + N259 approved but uncommitted; N260 stacks on them. Commit all together at git time.

## Round 3 — Human pass (approved)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-23
**Verdict:** approved

### Human decision (exact words)

> HUMAN APPROVED

N260 is approved by the human → moves to `done`.
