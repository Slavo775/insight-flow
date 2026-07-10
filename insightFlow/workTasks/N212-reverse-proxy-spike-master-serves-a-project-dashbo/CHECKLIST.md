# N212 — Reverse-proxy spike: master serves a project dashboard (incl. SSE) on one origin — Checklist

## Done criteria

- [ ] `master/server.ts` has a `/p/<id>/*` proxy handler that resolves the project URL from the registry and streams to it
- [ ] Proxied dashboard loads: HTML + JS/CSS/sound assets resolve under `/p/<id>/`
- [ ] Proxied JSON APIs work through the proxy
- [ ] SSE stream flows through the proxy incrementally (not buffered)
- [ ] Asset base-path approach chosen and documented
- [ ] `SPIKE.md` written: feasible? changes required? risks for N215

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] typecheck passes

## Verification

- [ ] `curl -N http://localhost:<master>/p/<id>/sse` streams `event:`/`data:` frames incrementally
- [ ] Dashboard at `/p/<id>/` renders and receives a live task update
