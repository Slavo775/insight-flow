# N218 — Hub robustness + UX fixes — Checklist

## Done criteria

- [x] Dashboard **re-registers** on a `401`/unauthorized liveness response (new id+token) then reconnects — a master restart brings running projects back online (`holdLiveness` + `reregister`)
- [x] Start picks a truly **free** port (OS-checked `findFreePort`), waits for the project to be **online** (`entry.online && entry.url`), and returns a `504` error the UI surfaces if it can't
- [x] `/p/<id>/*` failures render a **friendly HTML page** (`hubErrorPage`, ← Back to hub) for `text/html` navigations; JSON kept for non-HTML callers (route 404 + proxy 502)
- [x] The **Start / Starting…** control is a consistent `.card-btn` button matching the hub's buttons (disabled state dims; sanitized-id onclick kept)

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (**338/338**, +1)
- [x] typecheck passes

## Verification

- [x] E2E: master running + dashboard online → restart master → dashboard **online again** within ~8s (re-register) ✅
- [x] `curl -H 'Accept: text/html' /p/bogus/` → HTML error page + "Back to the hub"; without the header → JSON (test)
- [x] Start button + Starting… render as a consistent button (CSS)
