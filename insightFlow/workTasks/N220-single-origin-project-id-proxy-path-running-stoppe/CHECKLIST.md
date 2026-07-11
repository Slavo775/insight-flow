# N220 — Single-origin /project/<id> proxy path + running/stopped split — Checklist

## Done criteria

- [ ] `/project/<projectId>/*` reverse-proxies the project (resolve by `projectId`, then `id`)
- [ ] `<base>` / `__IF_BASE__` / asset rewrite use the `/project/<projectId>/` prefix
- [ ] `/p/<id>/*` 301-redirects to the canonical `/project/<projectId>/` (unknown id keeps friendly 404)
- [ ] Service worker never caches `/project/*`; `CACHE` bumped to `if-hub-v3`
- [ ] Card "Open" link + `startProject` navigation use `/project/<projectId>/`
- [ ] Overview renders two labeled sections: **Running (n)** and **Stopped (n)**; empty section hidden
- [ ] Cards regroup on `project-update` and on the stale sweep

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass (`npm test`)
- [ ] No regressions in affected area

## Verification

- [ ] `curl -sI localhost:6100/p/<uuid>/` → `301` to `/project/<projectId>/`
- [ ] `curl -s localhost:6100/project/<projectId>/` → project shell, assets under `/project/<projectId>/assets/`
- [ ] Overview shows Running + Stopped groups; Start moves a card Stopped → Running
- [ ] New test: `/project/<projectId>` proxies; `/p/<id>` redirects; HTML has section markers
