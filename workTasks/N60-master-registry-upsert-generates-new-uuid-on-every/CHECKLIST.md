# N60 — master registry upsert generates new UUID on every re-registration causing duplicate project cards — Checklist

## Done criteria

- [ ] `upsert()` in `packages/insight-flow-master/src/registry.ts` preserves `existing.id` — no new UUID generated for already-registered projects
- [ ] `POST /api/register` handler in `server.ts` emits `io.emit("project-update", entry)` after upsert
- [ ] `pnpm --dir packages/insight-flow-master run build` passes with no type errors

## Quality gates

- [ ] TypeScript compiles cleanly in `packages/insight-flow-master`
- [ ] No regressions in `upsert` / `update` / `updateStatus` paths

## Verification

- [ ] Start master + project server → open overview → restart master → project server reconnects → exactly 1 card visible (no duplicate)
- [ ] Trigger several activity events → card count stays at 1
