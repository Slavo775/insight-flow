# N20 — Multi-project overview page aggregating multiple insight-flow servers — Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**PR:** https://github.com/Slavo775/insight-flow/pull/13
**Verdict:** fix-needed

## Summary

N20 adds the `insight-flow-master` package (push-based aggregator) and wires project servers to auto-register and push state on every file-change. The overview card grid is served at `/overview` with Socket.IO live updates. Risk: medium — new process spawning, lock-file management, cross-package HTTP communication.

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Port 6000 is blocked by browsers (`ERR_UNSAFE_PORT`)** — Chrome/Chromium (and other browsers based on the same engine) maintain a hardcoded list of "unsafe" ports inherited from legacy protocols. Port 6000 (X11/X Window System) is on that list. The browser refuses to open `http://localhost:6000` with `ERR_UNSAFE_PORT` — no content loads at all.
   - **Fix:** Change the master server default port from `6000` to a safe port (e.g. `6100`). Update default in `packages/insight-flow-master/src/config.ts`, `packages/insight-flow-master/package.json` (if hardcoded), README examples, and any test fixtures.

2. **iframe embed not working** — The `/overview` route in the project server renders an iframe pointing to `http://localhost:6000/overview`. This fails for the same reason as blocker 1 (port blocked), but may also have a secondary issue: the master server may need to set `X-Frame-Options: ALLOWALL` or omit it entirely so browsers permit the iframe embed.
   - **Fix:** Resolve blocker 1 (port change) first. Then verify the iframe loads. If it still fails, add `res.setHeader('X-Frame-Options', 'ALLOWALL')` (or omit the header) on the master's `/overview` route.

### Suggestions (non-blocking)

- Consider documenting the list of browser-blocked ports in README so users know to avoid them when choosing a custom `master.port`.

### Notes

- Exact user quote: "why? also iframe not working" (with screenshot showing `ERR_UNSAFE_PORT` on `http://localhost:6000/overview`)
