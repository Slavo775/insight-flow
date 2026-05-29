# N71 — master overview: drop live/down badge, gate claudeStatus highlight on liveness — Checklist

## Done criteria

- [ ] `conn-live` / `conn-stale` / `conn-down` CSS classes removed from `overview.ts`
- [ ] `badgeInfo()` helper removed
- [ ] `refreshBadges()` function and its `setInterval` removed
- [ ] No `data-badge` markup remains in `renderCard`
- [ ] `renderCard` computes `isLive` and gates `statusCls` + `claudeBadgeCls` + `claudeBadgeLabel` on it
- [ ] Down/stale projects render with no green border, no Claude status badge
- [ ] Live projects with `claudeStatus === 'active'` still light up green
- [ ] Subtitle counter `N projects · M live` unchanged

## Quality gates

- [ ] `pnpm --dir packages/insight-flow-master run build` passes
- [ ] No other files touched (overview.ts only)

## Verification

- [ ] After restart, master overview shows debugger-pro-plus-3000 card with neutral border (no stale green)
- [ ] koktejl-new card lights green when active; no other card flips with it
- [ ] No `live` / `stale` / `down` badge anywhere on cards
