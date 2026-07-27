# N262 — Redesign Agent Activity pane (ActivityFeed) as LIVE STREAM timeline — Review

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-27
**PR:** (no PR yet)
**Verdict:** fix-needed

## Round 1 — AI pass

### Summary

The pane now matches the Lovable LIVE STREAM design (header + count, vertical rail, colored dots + pills + labels + target paths), and `describeEvent` preserves every real event kind's text/target/taskId/provider — verified in-browser (50 events), Timeline (Status Transitions) untouched, no console errors, tsc/build/eslint pass. No functional blockers. But the AI pass found one genuine WCAG AA fail on meaningful text (the pill), plus a color-coding regression for raw tool rows, plus dead CSS the rewrite orphaned. All three are cheap; recommend fixing in one pass.

### Checklist verification

- [x] LIVE STREAM header (pulse + count) + `<ol>` rail — pass
- [x] Colored dot markers on the rail — pass
- [x] Row: pill + label + time + optional target — pass
- [x] `describeEvent` covers all event kinds; text/target/taskId/provider preserved — pass (color drift on raw tools — see #2)
- [x] Empty state + provider badge preserved — pass
- [~] CSS hygiene — new `.act-stream*` good, but ~33 orphaned rules left behind (see #3)
- [x] No regression: Timeline / Status Transitions untouched (30 rows) — pass

### Blockers

None functional. (The pill-contrast item below is an AA fail the a11y reviewer would gate on — treated as a fix-needed item, not a functional blocker.)

### Non-blocking — recommended in one fix pass (all cheap)

1. **Pill text fails WCAG AA for red / purple / muted events (a11y).** `ActivityItem.tsx` `.act-stream-pill` (inline `color` over `rgba(color,0.18)`), `styles.css` `.act-stream-pill` (10px bold small text). Computed contrast on the panel surface: cyan 5.69 / green 5.96 / amber 6.20 **pass**; **red 4.05, purple 3.82, muted 3.23 fail** (need 4.5:1). The pill spells the event kind ("done", "tool-requested") — meaningful text, not decoration. Muted is a real case (`eventColor` falls back to muted for unknown/raw-tool events). **Fix:** make the pill **text** `var(--text)` and keep the **border** colored (and the tinted bg) — color stays a secondary cue via border + bg + dot; fixes all six colors at once, no info loss.

2. **Raw tool rows lose their color coding.** `ActivityItem.tsx` default branch uses `eventColor(ev)`, which returns muted for `ev.tool === "Read"/"Write"/"Edit"/"Bash"` (only `Tool`/`Event`/`Skill`/`Phase`/`Activity` are special-cased in `activity.ts`). Old code colored each icon distinctly (read=cyan, edit=yellow, bash=green, write=purple). Now every raw-tool dot+pill is muted grey — and "detailed" verbosity shows *exactly* these events, so that whole view goes monochrome. Text (tool name) is preserved, so it's data-vis loss, not info loss. **Fix:** in `describeEvent`, give the default branch a per-tool color (reuse `tokens.color.cyan/yellow/green/purple`) instead of the muted `eventColor`.

3. **~33 dead CSS lines orphaned by the rewrite.** Dropping the old glyph markup left these unused (confirmed zero TSX refs): `.activity-icon` + its `.read/.edit/.bash/.write/.phase/.skill/.other/.hook-amber/red/green/blue/purple/muted/.event-mandatory/optional` variants, `.activity-tool`, `.activity-file`, `.activity-file-muted`, `.activity-time`, `.activity-badge-phase/-event-mandatory/-event-optional/-skill/-hook-*`, `.activity-badge-provider-claude`, `.activity-phase-msg` (styles.css ~67-101). **Keep:** `.activity-badge` base + `.activity-badge-provider-cursor/other` (ProviderBadge), `.activity-status*` (tab badge), `.act-item*` (Timeline), `.activity-empty-state*` (empty state). **Fix:** delete the dead rules.

4. **Nit:** `itemBackground` in `activity.ts` is now a dead export (no caller), and the `ActivityFeed.tsx` header comment ("itemBackground/eventColor still drive…") is stale (only `eventColor` does). **Fix:** remove `itemBackground` + correct the comment (small, optional).

### Security & edge cases

None. Pure presentational rewrite over already-loaded, capped (≤50) events.

### Notes

- Confirmed clean: `<ol>/<li>` semantics correct; decorative dots/pulse are `aria-hidden`; rows correctly non-interactive (no keyboard-op requirement, unlike the board cards); truncated label/target keep full text in the DOM for AT; rail/dot offset math lands the dots on the rail; single inner scroll container (no nested-clip bug); `key={ev.id||i}` + pure `describeEvent`/`hexToRgb` per row are fine at ≤50.
- Pre-existing (out of scope, worth a token ticket): `--text-muted` `#737373` on surface ≈ 3.89:1, below AA — affects the time/target/count/hint muted text (dashboard-wide token, not introduced by N262).
- Optional a11y nit: the `<ol>` scroll region has no `tabIndex` — keyboard-only users can't focus it to scroll (page scroll still works). Add `tabIndex={0}` + `aria-label` if wanted.
- Process note: N262 went straight to implement at the human's request (no `/task-fe-analyze` + `/task-fe-plan`); TASK.md/CHECKLIST filled after. Not a code issue.
- **Context:** N258 + N259 + N260 + N261 (+ N262) all approved-or-pending but **uncommitted**; commit the stack at git time.

---

## Round 2 — AI re-review (after the fix pass)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-27
**Verdict:** ai-approved (clean)

### Summary

All three Round-1 items are fixed and verified in-source + in-browser. No blockers.

### Checklist verification

- [x] **#1 Pill contrast** — `.act-stream-pill { color: var(--text) }` (styles.css:58); the inline pill style dropped `color`, keeping only `borderColor`/`background` (ActivityItem.tsx:83). Pill text is now `#e5e5e5` (AA-readable on the dark panel for all six event colors); the event color still reads via the border + tinted bg + the rail dot (`borderColor: color` at ActivityItem.tsx:77). Verified in-browser: all pills `rgb(229,229,229)`, borders keep event color.
- [x] **#2 Raw-tool color coding** — `toolColor(tool)` added (read/glob/grep→cyan, edit→yellow, write→purple, bash→green, else muted), used by `describeEvent`'s default branch (ActivityItem.tsx:37,65). Verified: Edit rows yellow (234,179,8), Read rows cyan (6,182,212) on dot + pill border; special-cased kinds (Event/hook/Skill/Phase/Activity/Tool) unchanged (still use `eventColor`).
- [x] **#3 Dead CSS removed** — the ~33 orphaned rules are gone (grep: `.hook-*`, `.activity-badge-hook*`, `.activity-tool`, `.activity-phase-msg`, `.activity-badge-provider-claude` = 0 rules; the single `.activity-icon` hit is the explanatory comment at styles.css:70, not a rule). Kept `.activity-badge` base + `.activity-badge-provider-cursor/other` (still used by ProviderBadge). Stale `itemBackground` mention in the ActivityFeed comment corrected.
- [x] No new dead code — the `color` var is still used by the dot; `eslint` exit 0; no TSX refs to removed classes (only the comment).
- [x] No regression — Timeline (Status Transitions) untouched; tsc + build pass; no app console errors.

### Blockers

None.

### Non-blocking

Deferred nits (pre-flagged, out of scope, optional):
- `itemBackground` remains a dead export in `activity.ts` (a future `activity.ts` cleanup).
- Pre-existing `--text-muted` contrast (~3.89:1) on the time/target/count text — dashboard-wide token issue, not introduced here.
- `<ol>` scroll region has no `tabIndex` (page scroll still works) — optional keyboard-scroll enhancement.

### Security & edge cases

None (presentational).

### Notes

- N262 went straight to implement at the human's request (no analyze/plan gates); TASK.md/CHECKLIST filled after — process note, not a code issue.
- **Context:** N258 + N259 + N260 + N261 + N262 all approved-or-pending but **uncommitted**; commit the stack at git time.

## Round 3 — Human pass (approved)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-27
**Verdict:** approved

### Human decision (exact words)

> HUMAN APPROVED

N262 is approved by the human → moves to `done`.
