# N71 — master overview: drop live/down badge, gate claudeStatus highlight on liveness

**Type:** fix
**Priority:** medium
**Created:** 2026-05-28

## Problem

Master overview cards keep their green active-state highlight (border + background) after the project server goes down, because `registry.claudeStatus` is never cleared on disconnect — only `lastSeenAt` ages out. Result: a long-stopped project visually shows as "Claude is working here" until the master process restarts. Secondary annoyance: the per-card `live/down` connection badge is noise the user doesn't want — overall liveness is already conveyed by the subtitle's `N projects · M live` counter.

## Goal

1. Remove the per-card `live` / `stale` / `down` connection badge entirely (CSS classes, render markup, refresh interval, helper).
2. Gate the `claudeStatus`-driven visuals (green border, background tint, claude-status badge) on liveness: when `lastSeenAt > 60s` ago, the card renders neutral regardless of cached status.
3. Keep the subtitle's `N projects · M live` counter — it's the one place liveness still matters.
4. No server-side / data-model changes — `claudeStatus` keeps its last-pushed value in the registry (cheap to reconnect-and-recover). The fix is purely visual gating.

## Scope

### In scope

- `packages/insight-flow-master/src/overview.ts` only:
  - Remove `.conn-badge`, `.conn-live`, `.conn-stale`, `.conn-down` CSS classes (lines ~64-70).
  - Remove the `badgeInfo()` function (lines 129-134).
  - Remove the `[data-badge]` markup that renders inside each card header (search `data-badge` in `renderCard` to find).
  - Remove the `refreshBadges` function and the `setInterval(refreshBadges, 30000)` (bottom of file, line ~417).
  - Add an inline liveness check inside `renderCard` (`isLive = (Date.now() - new Date(p.lastSeenAt).getTime()) / 1000 < 60`).
  - Wrap `claudeStatus` reads behind `isLive` for the three places it drives visuals: `statusCls` (line 213), `claudeBadgeCls` (line 216), `claudeBadgeLabel` (line 221). When `!isLive`, both reduce to neutral / empty.

### Out of scope

- `registry.ts` — no clearing on disconnect, no heartbeats, no server-side sweep. Keep the cached `claudeStatus` so a project that briefly reconnects within the 60s window restores its state without an extra round-trip.
- The dashboard at `packages/taskflow/src/server/dashboard.ts` — independent codebase.
- The connection-status dot in the master header (`#status-dot`) — that's master↔browser connectivity, not project liveness. Leave it.
- Subtitle counter `N projects · M live` — keep as-is.

## Implementation plan

1. **Identify all `conn-*` and `badge`-related code** in `overview.ts` — grep `conn-live\|conn-down\|conn-stale\|data-badge\|badgeInfo\|refreshBadges`.

2. **Remove CSS** (lines ~64-70 block): the four `.conn-*` rules.

3. **Remove the `badgeInfo` helper** (lines 129-134).

4. **Strip the badge from `renderCard`**: find the line where it interpolates `<span class="conn-badge ..." data-badge>...</span>` (or similar) into the card header markup and delete that span.

5. **Add liveness gate in `renderCard`**: at the top of the function, compute `var isLive = (Date.now() - new Date(p.lastSeenAt).getTime()) / 1000 < 60;`. Then:
   - Line 213: `var statusCls = isLive && s.claudeStatus === 'active' ? 'status-active' : isLive && (s.claudeStatus === 'permission-required' || s.claudeStatus === 'awaiting-permission') ? 'status-permission' : '';`
   - Lines 216-220: prefix with `isLive ?` and default to `'claude-status-idle'` (or empty string) when not live.
   - Lines 221-226: same — when `!isLive`, set `claudeBadgeLabel = ''` so the badge doesn't render at all.

6. **Remove `refreshBadges` function and its `setInterval`** at the bottom of the file (line ~417). The function only existed to update the stripped badge.

7. **Build + manual smoke**: `pnpm --dir packages/insight-flow-master run build` (or whatever the workspace command is — check `package.json`); restart master via the script that owns it; open the overview, confirm:
   - Down/stale projects render with neutral border/background.
   - No `live`/`stale`/`down` badge anywhere on the cards.
   - When a live project transitions to `active`, its card lights up green as before.
   - Subtitle counter `N projects · M live` still shows.

## Verification

- `pnpm --dir packages/insight-flow-master run build` passes.
- Visit `http://localhost:6100/overview` (or wherever master serves) — debugger-pro-plus-3000 card, currently showing the stale green border, now renders neutral.
- Run koktejl-new, watch the overview: its card flips green-bordered. Other inactive cards stay neutral.
- Stop koktejl-new — after 60s its card returns to neutral on the next render (next `project-update` event from any project, OR a forced refresh).

## Notes

- The 60s threshold matches the existing `badgeInfo` definition — no policy change, just consolidation.
- `lastSeenAt` updates whenever the master receives a status/update/register POST, so an actively-working project never crosses the threshold.
- One subtle thing: when a project goes down, no `project-update` event fires by itself — the stale card only re-renders when the master receives some OTHER project's update. Acceptable for this round; if the user wants per-card auto-decay, a 30s `setInterval(rerenderStaleCards, 30000)` could be added later. Out of scope here.
- Related: N70 already removed sound from a separate concern; this is independent of audio.
