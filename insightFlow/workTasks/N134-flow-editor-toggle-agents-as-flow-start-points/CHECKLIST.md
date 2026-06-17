# N134 — Flow editor: toggle agents as flow start points — Checklist

## Done criteria

- [x] Node popover in `FlowEditor.tsx` has a "Set as start point / Unset start
      point" toggle beside "Remove from flow".
- [x] `FlowDraft` carries `entryAgents`; toggling updates it and reports a dirty draft.
- [x] `saveDraft` persists `draft.entryAgents` (filtered to existing agents).
- [x] Start-point nodes show a ★ in both `FlowEditor` and the read-only `FlowMap`.
- [x] Sidebar vocabulary reads "start point" (no "main").
- [x] No schema / server / `create.ts` changes.

## Quality gates

- [x] `pnpm build` passes (tsc strict)
- [x] `pnpm --dir packages/taskflow test` passes (219/219)
- [x] `pnpm typecheck` + `lint` (0 errors) + `format:check` (changed files) pass

## Verification

- [ ] `pnpm play` → Edit a custom flow → toggle a node as start point → Save →
      reload → ★ + "start point" persist in sidebar and map.
- [ ] Toggle two agents → both persist; unset one → it drops from `entryAgents`.
- [ ] Flow JSON under `insightFlow/projects/` lists the toggled ids in `entryAgents`.
