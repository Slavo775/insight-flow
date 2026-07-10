# N212 — Reverse-proxy spike: master serves a project dashboard (incl. SSE) on one origin — Checklist

## Done criteria

- [x] `master/server.ts` has a `/p/<id>/*` proxy handler that resolves the project URL (registry id or projectId) and streams to it
- [x] Proxied dashboard shell loads: HTML + JS/CSS assets resolve under `/p/<id>/` (asset refs rewritten; base hook injected)
- [x] Proxied JSON APIs work through the proxy (`/p/spike/api/project` → 200 JSON)
- [x] SSE stream flows through the proxy incrementally (retry + snapshot frame, not buffered)
- [x] Asset base-path approach chosen and documented (HTML rewrite for the shell; runtime `window.__IF_BASE__` for client API/SSE → N215)
- [x] `SPIKE.md` written: feasible ✅, changes required (client base-awareness), risks for N215

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (325/325)
- [x] typecheck passes

## Verification

- [x] `curl -N http://localhost:6110/p/spike/sse` streamed `retry:`/`event: snapshot` incrementally
- [x] `/p/spike/` shell renders with assets rewritten; asset + API 200 through the proxy
- [ ] Full in-browser live-data render through the proxy — deferred to **N215** (needs client base-awareness; documented in SPIKE.md, out of spike scope)
