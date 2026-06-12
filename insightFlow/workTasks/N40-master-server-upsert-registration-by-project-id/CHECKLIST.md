# N40 — Master server: upsert registration by project ID — Checklist

## Done criteria

- [ ] `registry.upsert(projectId, label, url)` exists and replaces `register`; `projectIdIndex` tracks projectId → UUID.
- [ ] Re-registering with the same `projectId` returns a new UUID but does NOT add a second entry to the registry.
- [ ] `MasterProjectEntry` has `projectId: string` field.
- [ ] `POST /api/register` extracts `projectId` from body (fallback: `label`).
- [ ] `registerWithMaster` in `packages/taskflow/src/server/index.ts` sends `projectId: config.projectName`.
- [ ] Both packages compile without TypeScript errors.

## Quality gates

- [ ] `pnpm --dir packages/insight-flow-master run build` passes.
- [ ] `pnpm --dir packages/taskflow run build` passes.
- [ ] No regressions in affected area.

## Verification

- [ ] Two `POST /api/register` calls with the same `projectId` → `GET /overview` shows exactly one card.
- [ ] Second registration returns a new UUID (not the old one).
- [ ] `state` from the previous registration is preserved on re-register (no blank flash).
- [ ] Client without `projectId` field still registers successfully (backward compat).
