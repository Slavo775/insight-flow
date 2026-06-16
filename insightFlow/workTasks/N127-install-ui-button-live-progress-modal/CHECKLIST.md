# N127 — Install UI — button + live progress modal — Checklist

## Done criteria

- [x] Install button + plan modal on the flow page (`ProjectPage` → `InstallModal`)
- [x] Live per-step progress from SSE (subscribes to `install-progress`; per-file
      granularity, finalized from the authoritative POST reports)
- [x] Summary + dismiss + re-run (idempotent emitter ⇒ "Run again")
- [x] Default flow installable (button uses `project.id`; default flow included)

## Quality gates

- [x] `npx tsc --noEmit` passes (server + client tsconfig)
- [x] `npm run lint` passes (no new findings; pre-existing FlowEditor warnings only)
- [x] Related tests pass (188; plan + install endpoints covered by N125/N126 tests)
- [x] No regressions in affected area

## Verification

- [x] Plan/install endpoints exercised by `custom-defs-api.test.mjs` (N125 plan,
      N126 idempotent install); modal wired to them. No React test harness in repo
      (consistent with N106–N126), so UI is verified by typecheck + build.
