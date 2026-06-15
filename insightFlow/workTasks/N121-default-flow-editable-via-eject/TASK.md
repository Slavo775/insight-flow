# N121 — Default flow editable via eject

**Type:** rework
**Priority:** medium
**Created:** 2026-06-15

## Problem

- The flow editor gates editing on `!isBuiltin` (N108/N109) — the shipped DEFAULT flow is read-only. The human wants the default flow editable too, via the same eject/override model: edits to the default flow are saved as an override in `insightFlow/projects/default.json`.

## Goal

1. `ProjectPage`/`FlowEditor` allow editing the default flow; Save writes the override to `insightFlow/projects/default.json` (shadowing the shipped default).
2. A **Revert to shipped** action removes the override.
3. Locked aspects (the default flow's canonical status set — Epic 4) remain read-only; only flow structure/layout/edges/states are editable here.
4. Custom flows are unaffected (already editable).

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/ProjectPage.tsx` — relax the `isBuiltin` edit gate; Save routes the default flow through the N120 override write; add Revert.
- Server: PUT `/api/projects/default` writes the override (via N120).
- Tests: edit default flow → override written + `/api/project` returns it; revert restores shipped.

### Out of scope

- Loader + CRUD (N119/N120). The canonical status-set lock (N128). New editor capabilities.
- Editing the shipped package default.

## Implementation plan

1. **Edit gate** — default flow becomes editable (still block locked status-set changes once N128 lands).
2. **Save/Revert** — PUT writes `insightFlow/projects/default.json`; Revert unlinks it.
3. **Tests** — default-flow edit→override→revert round-trip.

## Verification

- `pnpm build` + suite green.
- Playground: drag/edit the default flow → override appears, map reflects edits; Revert restores the shipped layout.
- Custom flows unchanged.

## Notes

- Depends on N119/N120. See N119/ANALYSIS.md.
- Reuses the N109–N111 editor save/round-trip.
