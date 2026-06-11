# N94 — Actions/events taxonomy — inline actions module + activity hooks via emitter — Checklist

## Done criteria

- [ ] `actions` section module carries the full former AGENT_EVENTS.md content incl. `taskflow:phase-markers` markers; `events` include module deleted
- [ ] All 9 composed agents reference `actions` (last in sequence); role files regenerated; diff = include line → inlined block only
- [ ] `AGENT_EVENTS.md` removed from repo root, templates, and init scaffolding (legacy consumer files tolerated)
- [ ] `phaseMarkers: false` strips the marked block from every consumer role file (tested in init integration tests)
- [ ] `activity/…` hook modules exist for all 7 lifecycle hooks with descriptions + script content; browsable via /api/modules
- [ ] Emitter writes hook script files (0755) + settings entries, tracked per agent in the managed manifest; removal cleans both
- [ ] `activity-hook.ts` bespoke installer retired/delegating; `detectActivityHookStatus` manifest-based; version semantics documented
- [ ] Cross-agent regression: installing/regenerating other agents never touches the activity group's artifacts

## Quality gates

- [ ] `pnpm build` passes
- [ ] Lint passes (no new findings vs baseline)
- [ ] `pnpm --filter insight-flow test` passes — drift suite green against regenerated role files; emitter + init suites updated

## Verification

- [ ] `prompt-build --compose --apply` after final commit: all 9 `unchanged`
- [ ] `grep -r AGENT_EVENTS packages/taskflow/src packages/taskflow/templates *.md` → only legacy-tolerance code
- [ ] Playground: activity group installed via emitter → hooks fire (events visible in dashboard activity feed); reapply `unchanged`; removal cleans scripts + settings
