# N219 — Hub reverse-registration handshake + client token privacy — Checklist

## Done criteria

- [x] `registry.ts` has `toPublicView` + `getAllPublic` returning `{ id, projectId, label, online, lastSeenAt, state }` (no `token`, `url`, `path`)
- [x] `markUp` (N218) removed from `registry.ts`
- [x] `GET /api/hub/projects` returns the public projection (no `token`)
- [x] `getOverviewHtml` is fed the public projection (no `token` in page data)
- [x] Every `broadcast("project-update", …)` sends the public projection
- [x] Proxy still resolves the real `url` server-side (project still openable — `/p/insight-flow/` → 200)
- [x] Project exposes localhost-only `POST /hub/reregister` → real `/api/register`; returns `{ declined: true }` when standalone
- [x] Master boot POSTs `/hub/reregister` per hub project (replaces GET `/health` + `markUp`); no response → nothing

## Quality gates

- [x] `npx tsc --noEmit` passes (`npm run typecheck`)
- [x] `npm run lint` passes (eslint clean; `markUp` refs gone)
- [x] Related tests pass (`npm test` → 339, +1 for token privacy)
- [x] No regressions in affected area

## Verification

- [x] `curl -s localhost:6100/api/hub/projects | grep -c token` → `0`
- [x] Overview HTML source contains no `token` (asserted in test)
- [x] Start a project, restart master → project re-registers itself and shows online (real register, not fabricated) — verified live
- [x] New test: token absent from hub API + SSR data + SSE frame (hermetic)
- [~] `/hub/reregister` handshake: master boot trigger lives in `runMaster` (persistent server + lock → not unit-testable in the `startMasterServer` harness); verified live end-to-end instead. Project-side `{ declined: true }` on standalone covered by the route's branch.
