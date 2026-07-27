# N259 — Project header card in dashboard (projectName Dashboard + shard/tasks/current + stat tiles) — Review

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-23
**PR:** (no PR yet)
**Verdict:** ai-approved

## Round 1 — AI pass

### Summary

Clean, reuse-heavy implementation. New shared `StatTile` is a correct thin primitive (tone→theme mapping right, transient `$tone`, typed via the augmented `DefaultTheme`, exported from the barrel). The card reuses `Card` and cleanly suppresses its hover accent via `styled(Card)` (injection order wins — verified neutral border in-browser). The meta line reuses the existing `label` verbatim, the title now shows `{projectName} Dashboard`, and the dead `.stats`/`.stat*`/`.top-bar*` CSS is fully removed. `tsc` + build pass, no console errors. **No blockers.** A few minors — one worth a quick fix (a duplicate `<h1>`), the rest minor/nit or pre-existing shared-token issues.

### Checklist verification

- [x] `StatTile` created (tone/value/label, theme tones, transient `$tone`) + exported — pass
- [x] `Stats` renders 4 tone tiles (Total neutral / Completed green / Active amber / Reviews violet) — pass
- [x] Completed/Active counts unchanged; Reviews changed to review-pending tasks (`REVIEW_PENDING`) — pass (see Non-blocking #2)
- [x] Card between `<Nav>` and board; green dot + `{projectName} Dashboard`; meta = `label` verbatim; `Stats` inside; full `tasks` set — pass
- [x] `loadError` alert + engine-off chip preserved — pass
- [x] `.stats`/`.stat*`/`.top-bar*` removed; `.live-dot`/`.engine-chip` kept — pass
- [x] build + tsc pass; verified in-browser (Total 5 / Completed 3 / Active 0 / Reviews 1) — pass

### Blockers

None.

### Non-blocking

1. **Duplicate `<h1>` on the page (a11y minor — recommended fix, one word).** The N258 `Nav` already renders the project name as an `<h1>` (`components/Header.tsx:83` `styled.h1`, emitted at `Header.tsx:132`). The card adds a second `<h1>` (`App.tsx:93` `<Text as="h1" $variant="h1">{projectName} Dashboard`). Two top-level headings with near-identical text and no `<h2>` between. **Fix:** demote the card title to `as="h2"` (keep `$variant="h1"` so the size is unchanged): `App.tsx:93` `as="h1"` → `as="h2"`. Contained to N259; leaves the banner brand title as the page h1.

2. **Reviews set could include `changes-implemented` (completeness, judgment call).** `REVIEW_PENDING = ["implemented","reviewing","fixed"]` (`ui.tsx:145`). Excluding `fix-needed`/`changes-requested` is correct (those await a *fix*). But `changes-implemented` is the change-workflow analog of `fixed` — work done, re-review is the next step (routes `→ task-git` like `fixed`). Arguably belongs in the set. The spec chose a deliberately tolerant set and flows are custom, so this is a judgment call, not a bug. **Optional fix:** add `"changes-implemented"`.

3. **Dead `"implementing"` string in the Active count (nit, pre-existing).** `ui.tsx:150` `["in-progress","implementing","changes-implementing"]` — `"implementing"` is not a canonical `TaskStatus` (the change transient is `changes-implementing`), so it never matches. Harmless; preserved verbatim because the human chose "keep current Active logic". Could drop `"implementing"`, but it does not change the count. (Note: custom flows *could* define an `implementing` status, so leaving it is also defensible/tolerant.)

### Security & edge cases

None. No new input-trust boundary; counts are pure client-side filters over already-loaded tasks.

### Notes (accepted / pre-existing)

- **StatTile as bare divs** (value + label) rather than `<dl>/<dt>/<dd>` — nit. DOM order means a screen reader still reads "5, Total Tasks" together; the Lovable design used `dl/dt/dd` if explicit pairing is wanted later. Optional.
- **`.live-dot` conveys connection state by color only** (WCAG 1.4.1) — minor, pre-existing (the dot existed before N259). The `loadError` alert covers hard errors; a visually-hidden `role="status"` text ("Reconnecting"/"Disconnected") would close the gap. Not introduced by N259.
- **Muted label/subtitle contrast** — `textMuted #737373` at 11–12px ≈ 3.9:1 on surface, below AA 4.5:1 for small text. Pre-existing shared-token issue (same token flagged on N258 nav-links); systemic fix is lightening the token. Stat *numbers* pass AA (green 8.1:1, amber 8.6:1, purple 4.7:1 as large text).
- **Engine-off chip hint** lives only in a `title` attr on a non-focusable span — invisible to keyboard/touch/SR. Visible chip text still conveys the state; minor, pre-existing behavior.
- `.live-dot.disconnected` selector is dead (App.tsx only ever adds `reconnecting`) — pre-existing, not N259.
- **Context:** N258 (dashboard header) is approved but uncommitted; N259 stacks on it. Commit both together at git time.

## Round 2 — Human pass (stat-tile wrap)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-23
**Verdict:** fix-needed

### Human feedback (exact words)

> HUMAN REVIEW FIX NEEDED [Image] this state is wrong we need to wrap always two not only one

(Image: the 4 stat tiles wrapped as **3 + 1** — Total / Completed / Active on row 1, Reviews alone on row 2.)

### Interpretation for the implementer

The stat tiles currently use `flex-wrap: wrap` (`ui.tsx:135-139` `StatsRow`) with each tile `flex: 1; min-width: 120px`. At mid widths this fits 3 tiles on the first row and drops the 4th alone (**3 + 1**). The human wants: when the tiles wrap, wrap **2 per row (2 × 2)** — never a single orphan.

Fix: replace the flex-wrap with a CSS **grid** that is 2 columns at narrow widths and 4 columns when wide (matches the Lovable design's `grid-cols-2 gap-2 sm:grid-cols-4`):
- `StatsRow`: `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: <same 16px>;` and at a breakpoint (e.g. `@media (min-width: 640px)`) `grid-template-columns: repeat(4, minmax(0, 1fr));`. This guarantees 2 or 4 per row — never 3 + 1.
- `StatTile` (`StatTile.tsx:22-25`): `flex: 1` is ignored inside a grid — drop it, and set `min-width: 0` so the grid cells can shrink cleanly (the `minmax(0, 1fr)` handles equal widths). Keep the padding/look.
- Keep the `margin-top` above the grid.

Verify in the browser: at the card width in the screenshot the tiles show **2 × 2**; on a wide desktop they show **4 across on one row**; never 3 + 1. Also confirm no horizontal overflow at very narrow widths.

(Optional, from Round 1: the duplicate-`<h1>` demotion `App.tsx:93` `as="h1"` → `as="h2"` — do it in the same pass if you like, since you're back in these files.)

---

## Round 3 — AI re-review (after the wrap fix)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-23
**Verdict:** ai-approved (clean)

### Summary

The human's Round-2 complaint (tiles wrapping 3+1) is fixed, plus the Round-1 duplicate-`<h1>` was folded in. `StatsRow` is now a CSS grid — 2 columns base, 4 columns at `≥640px` — so the four tiles wrap **2×2** on narrow and **4-across** on wide, never 3+1. `StatTile` dropped `flex:1` and uses `min-width:0` for clean grid shrinking. The card title is now `<h2>` (`$variant="h1"` keeps the size), leaving one `<h1>` on the page. Verified in-browser. No blockers.

### Checklist verification

- [x] Tiles wrap 2×2 / 4-across, never 3+1 — verified: at 613px viewport → 2 tracks, tiles in 2 rows (tops 177/177/261/261); forcing the 4-col rule → 1 row, no horizontal overflow.
- [x] `StatTile` `min-width:0` — number/label not clipped (verified; tiles render fully at narrow widths).
- [x] One `<h1>` on the page; card title is `<h2>` with unchanged size — verified (h1 count = 1).
- [x] No regression — counts, tones, card wrapper, meta line unchanged; `tsc` + build pass; no app console errors.

### Blockers

None.

### Non-blocking

Carried over from Round 1, still optional (human did not request; not addressed this pass):
- Reviews set could add `"changes-implemented"` (completeness, judgment call).
- Dead `"implementing"` string in the Active count (harmless; preserved per the "keep current Active logic" decision).
- Pre-existing shared-token issues (muted-label contrast, color-only live-dot, `title`-only engine tooltip) — not introduced by N259.

### Security & edge cases

None (layout-only change).

### Notes

- The `640px` breakpoint is viewport-based (like the Lovable `sm:`), a reasonable proxy since the card spans the content width. A container query would be more precise but is not needed here.
- N258 remains approved-but-uncommitted; commit N258 + N259 together at git time.

## Round 4 — Human pass (approved)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-23
**Verdict:** approved

### Human decision (exact words)

> HUMAN APPROVED!

N259 is approved by the human → moves to `done`.
