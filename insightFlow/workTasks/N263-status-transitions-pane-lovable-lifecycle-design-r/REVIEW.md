# N263 — Status Transitions pane → Lovable Lifecycle design (rail + from-to Badges) — Review

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-27
**PR:** (no PR yet)
**Verdict:** ai-approved

## Round 1 — AI pass

### Summary

Clean rebrand. Both reviewers found no blockers and no bugs. The from→to derivation is correct (captured during the per-task walk over the append-only, ordered `statusHistory`, before the cross-task sort — a foreign task's status can never leak in), `Badge` is the right pill (canonical + custom-flow aware, richer than the old inline label), the new "Current" pill passes WCAG AA (~6.3:1), the `.act-item*` CSS is fully removed, and `.act-stream*` is cleanly shared with the N262 Agent Activity pane (untouched). Only cosmetic nits. Verified in-browser (30/33 transitions, from→to Badges, Current on newest, single Badge for first-entry rows, Agent Activity intact). tsc + build + eslint pass, no console errors.

### Checklist verification

- [x] `TimelineEvent` + `from` derivation (per-task, ordered) — pass (correctness confirmed)
- [x] LIFECYCLE header + count `Chip`; `.act-stream` rail + colored dots — pass
- [x] Rows: `Badge(from) → Badge(to)` / single `Badge(to)`; "Current" on newest; time; "taskId · by X" line — pass
- [x] Pills use `Badge` (not `StatusPill`); flow-aware — pass
- [x] Empty state preserved — pass
- [x] `.act-item*` removed; `.act-stream*` + ActivityFeed/ActivityItem untouched — pass
- [x] No regression: Agent Activity (N262) intact; both Timeline call sites get the look — pass

### Blockers

None.

### Non-blocking (all optional / cosmetic)

1. **"Current" wording (UX nit).** `ui.tsx` `i === 0` marks the single globally-newest transition across ALL tasks — not each task's current status. "Current" can read as "this task's current status". Deliberate per the human's cross-task choice, so not a bug. **Optional:** rename the string to **"Latest"** to avoid implying per-task currency.
2. **`.act-stream-target` is monospace.** The second line "{taskId} · by {by}" reuses `.act-stream-target` (styles.css:61), which is `font-family: 'SF Mono'` (inherited from ActivityFeed's file-path semantics). So "by taskmaster" prose renders monospaced. Cosmetic only. **Optional:** a small non-mono variant class for this line if the mono look is unwanted.

### Security & edge cases

- **Same-status re-set → "X → X" (upstream, not N263).** `core/set-status.ts` has no guard against `target === task.status`, so a duplicate history entry would render a "X → X" row. Rare, and it's an upstream data concern, not this UI change. Noted only; out of scope.

### Notes

- Pre-existing (out of scope, shared with N262): `.act-stream-target` muted `--text-muted` ≈3.89:1 (dashboard-wide token); the `<ol>` scroll region has no `tabIndex` (page scroll works). Neither introduced here.
- Reuse honored: `.act-stream*` rail/dot/head/row/time/target, `Badge`, `Chip`, `statusColor`/`taskStatusColor`/`hexToRgb`/`formatTime`, `useFlowStatusMap`. No new component; no App.tsx change. `statusLabel` import cleanly removed (Badge computes labels).
- **Context:** N258 + N259 + N260 + N261 + N262 + N263 all approved-or-pending but **uncommitted**; commit the whole stack at git time.

## Round 2 — Human pass (bigger pills + text)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-27
**Verdict:** fix-needed

### Human feedback (exact words)

> please the pills and the text should have biggger size as has right now this is HUMAN REVIEW FIX NEEEDED

### Interpretation for the implementer — SCOPE THE BUMP to the Lifecycle pane only

Make the from→to **pills (Badge)** and the **row text** larger in the "Status Transitions / Lifecycle" pane. Two shared-code traps to avoid:
- **`Badge` is shared** — the Kanban ticket cards use the same `Badge` (`ui.tsx` TaskCard). Do NOT globally enlarge `StyledBadge`/`HexBadge` (`components/Badge.tsx:29,40` font-size `xs`) or the cards grow too.
- **`.act-stream*` is shared with the Agent Activity pane (N262)** — do NOT bump the base `.act-stream-time` / `-target` / `-live` / `-count` globally, or the Agent Activity pane grows too.

Fix (scoped):
1. **Bigger Badges via a size variant on the shared component.** Add an optional `size?: "sm" | "md"` (or `$big`) prop to `Badge` (`components/Badge.tsx`): default `sm` = current (`font.size.xs` + `padding:1px 6px`), `md` = larger (e.g. `font.size.sm` or `base`, `padding:2px 8px`). Pass `size="md"` to BOTH the `from` and `to` `<Badge>`s in the Lifecycle pane (`ui.tsx` Timeline). Kanban Badges pass no size → stay `sm`. This keeps the shared component safe and makes it more reusable.
2. **Bigger text, scoped.** Add a modifier class to the Lifecycle pane wrapper — e.g. `<div className="act-stream-wrap lifecycle">` (or on the `<ol>`). Then in `styles.css`, bump the pane's text sizes ONLY under `.lifecycle`: `.lifecycle .act-stream-live` (the "Lifecycle" title), `.lifecycle .act-stream-count`, `.lifecycle .act-stream-time`, `.lifecycle .act-stream-target` (the "taskId · by" line), and `.lifecycle .lifecycle-current` (the marker pill) — roughly +2px each (e.g. 10→12, 11→13). Do NOT touch the base `.act-stream*` rules (Agent Activity pane keeps today's sizes).
3. Also fine to slightly increase the row gap / dot size in `.lifecycle` if it looks cramped at the larger text — implementer's eye.

Verify: the Lifecycle pane pills + text are visibly bigger; the **Agent Activity pane (N262) is unchanged**; the **Kanban card Badges are unchanged**. This is human fix-needed → hand back to `/task-fe-implement`.

---

## Round 3 — AI re-review (after the bigger-pills+text fix)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-27
**Verdict:** ai-approved (clean)

### Summary

The human's "bigger pills + text" request is done and correctly **scoped** — verified in-browser and in-source. No blockers.

### Checklist verification

- [x] **Bigger pills, scoped** — `Badge` gained an optional `size?: "sm"|"md"` (transient `$size`; `md` = `font.size.base` + `3px 8px`). `size="md"` appears **only** on the two Lifecycle Badges (`ui.tsx:383,389`). Every other caller passes no size → `sm` unchanged (grep: Kanban TaskCard `ui.tsx`, DetailPanel verdict/incident/history, ModuleDetail — all sizeless). Verified Lifecycle badge 12px.
- [x] **Bigger text, scoped** — the pane wrapper is `act-stream-wrap lifecycle`; the size bumps live only under `.lifecycle` (styles.css:67-72). The **base `.act-stream*` rules are untouched** (still 11/10/10/11px). Verified: Lifecycle title/count/time 12px, target 13px; Agent Activity pane still 11px.
- [x] **No regression** — Agent Activity (N262) unchanged; Kanban Badges unchanged by construction; from→to logic + Current + Timeline data unchanged. tsc + build + eslint pass; no console errors.

### Blockers

None.

### Non-blocking

Carried over from Round 1 (optional, not requested): "Current" → "Latest" wording; `.act-stream-target` monospace on the "by" line. Unchanged.

### Security & edge cases

None (presentational size change). The upstream "X → X" same-status-reset note from Round 1 still stands (out of scope).

### Notes

- `$size` is a `$`-prefixed transient prop — styled-components strips it from the DOM; the default (undefined) path is byte-identical to the pre-N263 Badge, so no existing consumer changes.
- `.lifecycle .act-stream-*` beats the base `.act-stream-*` by one extra class of specificity (and comes later in the file) — correct override, no `!important`.
- **Context:** N258–N263 all approved-or-pending but **uncommitted**; commit the whole stack at git time.

## Round 4 — Human pass (approved)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-27
**Verdict:** approved

### Human decision (exact words)

> approved

N263 is approved by the human → moves to `done`.
