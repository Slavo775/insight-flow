# N128 — status-transition module kind + Project.statuses (flow status set) — Checklist

## Done criteria

- [x] status-transition module kind added (`AgentModuleSchema`; LOCKED by kind in
      `user-registry.isLockedModule` — custom: ones still allowed)
- [x] ProjectSchema.statuses ordered set; default flow = canonical enum verbatim
      (`agents/project/default.json`, title=id so badges stay byte-identical)
- [x] Edges/states constrained to the flow's status set (empty ⇒ canonical
      fallback for pre-N128 flows); status ids unique; state mapsTo ⊆ set
- [x] No engine behavior change (data only; emitter/composer skip the new kind)

## Quality gates

- [x] `npx tsc --noEmit` passes (server + client)
- [x] `npm run lint` passes (no new findings)
- [x] Related tests pass (195; +7 in `test/flow-statuses.test.mjs`)
- [x] No regressions in affected area (existing 188 green; default flow loads)

## Verification

- [x] schema validation matrix + default canonical set verified by
      `test/flow-statuses.test.mjs` (module kind, ordered canonical set, custom
      universe rejects out-of-set triggers, back-compat fallback, duplicate ids,
      mapsTo constraint, kind-based lock)
