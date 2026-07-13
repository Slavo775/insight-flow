# N220 — Single-origin /project/<id> proxy path + running/stopped split — Checklist

## Done criteria

- [x] `/project/<projectId>/*` reverse-proxies the project (resolve by `projectId`, then `id`)
- [x] `<base>` / `__IF_BASE__` / asset rewrite use the `/project/<projectId>/` prefix
- [x] `/p/<id>/*` 301-redirects to the canonical `/project/<projectId>/` (unknown id keeps friendly 404 via `respondNoProject`)
- [x] Service worker never caches `/project/*`; `CACHE` bumped to `if-hub-v3`
- [x] Card "Open" link + `startProject` navigation use `/project/<projectId>/`
- [x] Overview renders two labeled sections: **Running (n)** and **Stopped (n)**; empty section hidden
- [x] Cards regroup on `project-update` and on the stale sweep (both call `renderSections`)

## Quality gates

- [x] `npx tsc --noEmit` passes (`npm run typecheck`)
- [x] `npm run lint` passes (eslint clean)
- [x] Related tests pass (`npm test` → 342, +2 new; N212 proxy test updated to `/project/`)
- [x] No regressions in affected area

## Verification

- [x] `curl /p/<uuid>/kanban` → `301` → `/project/insight-flow/kanban` (query preserved) — verified live
- [x] `curl /project/insight-flow/` → project shell with `<base href="/project/insight-flow/">`; assets under `/project/insight-flow/assets/` load (200, 673KB) — verified live
- [x] Overview shows Running + Stopped groups (`'Running'`/`'Stopped'`/`/project/` in HTML); grouping reflects online state live (Running 2 / Stopped 3)
- [x] New tests: `/project/<projectId>` proxies + `/p/<id>` 301-redirects (query preserved) + overview section markers
