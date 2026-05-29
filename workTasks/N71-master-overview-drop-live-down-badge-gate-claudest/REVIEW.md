# N71 — master overview: drop live/down badge, gate claudeStatus highlight on liveness — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**PR:** (no PR — master is workspace-local, not published; release rides next master rebuild)
**Verdict:** approved

## Summary

Single-file, 30-line net diff in `packages/insight-flow-master/src/overview.ts`. Strips the `live`/`stale`/`down` per-card badge entirely (CSS, helper, markup, and refresh handler) and gates every `claudeStatus`-driven visual through a new `isProjectLive(lastSeenAt)` helper so a project that hasn't checked in for 60s renders neutral. Two positive deviations from the spec, both intentional and noted in the implementer's report: (1) `badgeInfo` was REPLACED with a sharper-named helper `isProjectLive` (also used by `updateSubtitle`), and (2) the 30s `setInterval` survives as `refreshStaleCards` doing a full innerHTML rerender, which addresses the spec's own "subtle thing" footnote about per-card auto-decay without a separate task. Risk: **low** — UI-only, no server-side / data-model / API changes.

## Checklist verification

- [x] `conn-live` / `conn-stale` / `conn-down` CSS classes removed — verified at `overview.ts:62` block (4 lines deleted, 0 remaining).
- [x] `badgeInfo()` helper removed — replaced with `isProjectLive` at `overview.ts:129-131`.
- [x] `refreshBadges()` function and its `setInterval` removed — function replaced with `refreshStaleCards` (`overview.ts:267-273`); interval rewired at `overview.ts:404` (`setInterval(refreshStaleCards, 30000)`). Strict spec said "remove"; implementation kept a 30s rerender. **Better outcome** — see Non-blocking #1.
- [x] No `data-badge` markup remains — confirmed `grep -c "data-badge" overview.ts` → 0.
- [x] `renderCard` computes `live` and gates `statusCls` + `claudeBadgeCls` + `claudeBadgeLabel` on `effectiveStatus = live ? s.claudeStatus : null` — verified at `overview.ts:200-228`.
- [x] Down/stale projects render with no green border and no Claude status badge — `effectiveStatus === null` falls through every branch to `''`, and `claudeBadgeHtml` is gated on `claudeBadgeLabel` being non-empty, so the wrapping `<div>` doesn't render at all (`overview.ts:241-245`).
- [x] Live projects with `claudeStatus === 'active'` still light up green — `effectiveStatus` resolves to `'active'`, `statusCls = 'status-active'` → green border + tint preserved.
- [x] Subtitle counter unchanged in semantics — `updateSubtitle` now calls the shared `isProjectLive` helper, same 60s threshold (`overview.ts:259`).

## Blockers

None.

## Non-blocking

1. **`refreshStaleCards` is a full innerHTML replace, not a targeted attribute update.** The previous `refreshBadges` updated only `.conn-badge` className + textContent in place; the new function recreates every card DOM node every 30 seconds. For 4–10 cards this is performance-irrelevant, but it does drop in-flight CSS transitions, hover states, and any text-selection inside cards. No current animations depend on persistent DOM in the master overview, but if you ever add a pulsing border to `status-active`, you'll need either per-card targeted updates or to debounce-skip the rerender when no card has actually crossed the 60s threshold. Worth a `// TODO` if you anticipate adding animations.

2. **Subtle dead-code cleanup possible.** In the old code, the `claudeBadgeCls` chain ended with `: 'claude-status-idle'` as a fallback for ANY unknown status; in the new code it ends with `: ''`. The fallback was already effectively dead — the badge HTML is gated on `claudeBadgeLabel` being non-empty, and the label chain has always ended with `''` for unknown statuses. The new explicit `effectiveStatus === 'idle' ? 'claude-status-idle' : ''` is clearer; no behavioural change. Worth noting because a future reader might "fix" it back to a default fallback thinking the new code lost something.

3. **No version bump / changelog touch.** Correct — `packages/insight-flow-master` is workspace-internal, not published to npm. The change picks up on the next master restart. If consumers track master changes for QA reproducibility, a one-line entry in the per-package CHANGELOG (if it exists for master) would be a nice paper trail; otherwise skip.

## Security & edge cases

- `isProjectLive` returns `false` for any non-finite `lastSeenAt` parse (`NaN < 60` → false) — projects with malformed timestamps render neutral, which is the safe default. No risk.
- The `effectiveStatus = live ? s.claudeStatus : null` short-circuit means a project that posts `awaiting-permission` and then goes silent past 60s loses its alert-border highlight. Acceptable — if the project server is gone, the prompt is no longer actionable from that side.
- `setInterval(refreshStaleCards, 30000)` runs unconditionally. If the overview tab stays open for hours unused, this fires ~120×/hour. Cheap (full re-render of ~10 cards) but consider gating on `document.visibilityState === 'visible'` if dashboard battery use ever matters. Non-blocking — not worth shipping speculatively.

## Notes

- Build verified: `pnpm --dir packages/insight-flow-master run build` → `dist/index.js 31.17 KB`, no errors. Master restarted on PID 72220, listening on `:6100`.
- Build-time gotcha caught during implementation: the script body in `overview.ts` is emitted as a backtick template literal, so any backticks inside `// comments` of the embedded JS break the outer literal. Implementer caught this on first build (`"Expected ';' but found 'active'"` from the comment `'active'/'awaiting-permission'`), fixed by switching to single quotes in comments. Worth a `// NOTE: avoid backticks in comments — this whole block is a template-literal body` at the top of the embedded script for the next person.
- Side effect of the master restart that landed this fix: the in-memory registry was flushed, so all four previously-shown projects (insight-flow, debugger-pro-plus-3000, ithinktoday-widget, koktejl-new) start absent and re-appear only as their servers push. This temporarily makes the bug invisible (no stale data → no stale rendering) but also confirms the gating logic when stale projects come back into the registry and then go silent. Not something to test on this round; it'll exercise itself over normal use.
- Related: depends on N68's `claudeStatus` push from `packages/taskflow/src/server/index.ts:736`. No coupling to change.

---

## Polish — Round 2 (non-blocking follow-ups, user-authorised)

**Author:** task-review-fix
**Date:** 2026-05-28

Addresses all three actionable non-blocking notes from Round 1 (#3 was "no action needed"; the build-time gotcha from the Notes section is also captured here):

1. **Round-1 Notes (build-time gotcha)** — added a header comment at the top of the embedded script body warning future maintainers that this whole block is a TS template literal and backticks (even inside `//` comments) terminate the outer literal. Caught me on N71 round 1; won't catch the next person.

2. **Round-1 non-blocking #2** — added a comment above the `claudeBadgeCls` chain explaining why the trailing `: ''` is intentional and should NOT be "fixed" back to a `'claude-status-idle'` fallback (it would be unreachable because `claudeBadgeHtml` is gated on `claudeBadgeLabel` being non-empty).

3. **Round-1 non-blocking #1** — added a `// TODO` above `refreshStaleCards` documenting the innerHTML-replace tradeoff and what to do (per-card targeted updates, or skip the rerender) if a future pulsing-border / animation is added to `.status-active`.

### Files changed (polish only)

- `packages/insight-flow-master/src/overview.ts` — three comment additions, behaviour-neutral.

### Gates

- `pnpm --dir packages/insight-flow-master run build` ✓ — `dist/index.js 32.00 KB` (was 31.17 KB before the comments; the +0.8 KB is the embedded comment payload).
