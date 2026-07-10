# N212 — Reverse-proxy spike: conclusion

**Verdict: FEASIBLE ✅** — the master can serve a project dashboard, its assets, its JSON APIs, and its **live SSE** through `/p/<id>/*` on one origin. Proceed with the roadmap (N215 app shell).

## What was proven (real run: master :6110 proxying a dashboard :6209)

| Check | Result |
|-------|--------|
| **HTML shell** `/p/spike/` | 200; `<base href="/p/spike/">` + `window.__IF_BASE__="/p/spike/"` injected; `/assets/…` refs rewritten → `/p/spike/assets/…` |
| **Asset** `/p/spike/assets/index-*.js` | 200, 673 KB, `text/javascript` — streamed through the proxy |
| **JSON API** `/p/spike/api/project` | 200, `application/json` |
| **SSE** `/p/spike/sse` | `text/event-stream`; streamed `retry: 1000` + `event: snapshot` **incrementally** (identical to hitting the dashboard directly) — **no buffering** |

## What changed (the whole spike)

- `packages/taskflow/src/master/server.ts`:
  - `proxyToProject(targetBase, prefix, rest, req, res)` — forwards via `node:http` `request`, **pipes** the response unbuffered (SSE-safe); only the small HTML shell is buffered to rewrite `/assets/` → `/p/<id>/assets/` and inject the base hook; strips `accept-encoding`/`host`; forwards the request body.
  - Route `^/p/([^/]+)(/.*)?$` → resolve the project by registry id **or** `projectId`, then proxy.

## The base-path finding (the real work for N215)

The HTML rewrite makes the **shell + assets** load under the prefix. But the dashboard **client uses hard-coded absolute URLs** for live data:
- `packages/taskflow/src/dashboard/client/useDashboardStream.ts` → `new EventSource("/sse")`
- `packages/taskflow/src/dashboard/client/api.ts` → ~30 × `fetch("/api/…")`

Those ignore `<base>` (absolute paths) and would hit the **master root**, not `/p/<id>/…`. So in a browser the shell renders but live data/SSE would 404. **N215 must make the client base-aware**:

- Read the injected `window.__IF_BASE__` (fallback `"/"`) into a single `basePath` constant.
- Add `apiUrl(p)` / `sseUrl()` helpers that prefix with `basePath`; apply them in `api.ts` (centralize the ~30 `fetch` calls through one helper) and `useDashboardStream.ts`.
- Keep Vite `base: "/"` — the base is **runtime** (from the injected hook), not build-time, so the *same* build works standalone (`/`) and proxied (`/p/<id>/`).

This is mechanical but broad; it belongs in N215, not the spike (per scope).

## Risks / notes for N215

- **SSE is fine** (dashboard uses SSE, not WebSocket) — no WS bridge needed. If a future feature adds WS, the proxy needs an `upgrade` handler (out of scope now).
- POST bodies are forwarded (`req.pipe(proxyReq)`); GET/asset/API/SSE all verified.
- Proxy resolves by registry id or `projectId` — N215's switcher should link by whichever is stable.
- No auth on the proxy yet — pairs with N214's per-project token if we want to gate it (loopback-only today).

## Decision

Plumbing is solid. Next: N213 (persistent registry) and N215 (app shell), where the client base-awareness above lands.
