# N219 — Hub reverse-registration handshake + client token privacy — Checklist

## Done criteria

- [ ] `registry.ts` has `toPublicView` + `getAllPublic` returning `{ id, projectId, label, online, lastSeenAt, state }` (no `token`, `url`, `path`)
- [ ] `markUp` (N218) removed from `registry.ts`
- [ ] `GET /api/hub/projects` returns the public projection (no `token`)
- [ ] `getOverviewHtml` is fed the public projection (no `token` in page data)
- [ ] Every `broadcast("project-update", …)` sends the public projection
- [ ] Proxy still resolves the real `url` server-side (project still openable)
- [ ] Project exposes localhost-only `POST /hub/reregister` → real `/api/register`; returns `{ declined: true }` when standalone
- [ ] Master boot POSTs `/hub/reregister` per hub project (replaces GET `/health` + `markUp`); no response → nothing

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes (prune unused imports; `markUp` refs gone)
- [ ] Related tests pass (`npm test`, expect ≥338 + new)
- [ ] No regressions in affected area

## Verification

- [ ] `curl -s localhost:6100/api/hub/projects | grep -c token` → `0`
- [ ] Overview HTML source contains no `token`
- [ ] Start a project, restart master → project re-registers itself and shows online (real register, not fabricated)
- [ ] New test: token absent from hub API + SSR data
- [ ] New test: `/hub/reregister` handshake adopts a running project; a declining project is not force-onlined
