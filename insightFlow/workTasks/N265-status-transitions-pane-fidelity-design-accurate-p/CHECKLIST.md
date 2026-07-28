# N265 — Status Transitions pane fidelity — Checklist

## Done criteria
- [x] `LifecyclePill` local component (bordered + translucent status color + inner dot + UPPERCASE label); statusLabel re-imported
- [x] From/to pills in `Timeline` use `LifecyclePill` (from → to; single pill + no arrow when no `from`)
- [x] Ring rail marker `.lifecycle-dot` (colored ring + inner dot via `--c`); newest row (`i===0`) glows via `data-current`
- [x] Hollow-circle bullet ○ before the "taskId · by X" actor line (scoped to `.lifecycle`)
- [x] Agent Activity pane (N262) UNCHANGED — base `.act-stream*` untouched; shared `Badge` untouched (Kanban/DetailPanel unaffected)

## Quality gates
- [x] `npx tsc --noEmit` passes
- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (374)
- [x] ESLint clean; no new npm dependency

## Verification
- [x] Status Transitions: bordered/translucent/dotted UPPERCASE pills, ring markers, Current glow, actor bullet — matches Image #7
- [x] Agent Activity unchanged; Kanban/DetailPanel Badges unchanged; no console errors (fresh repo build)
