# N223 — LAN/mobile hub access via a trusted-host allowlist — Checklist

## Done criteria

- [x] `INSIGHT_FLOW_TRUSTED_HOSTS` parsed (comma-separated host / `host:port`, IP or hostname) into a trusted-host set via `headerHost` normalization — `trustedHostSet()` in `server.ts`
- [x] `isTrustedLocalRequest` trusts loopback **OR** an allowlisted host — for both the `Host` and `Origin` checks; `Sec-Fetch-Site` gate unchanged — `isTrustedHost(host, trusted)` used for both gates
- [x] Empty/unset env → behavior identical to today (localhost-only) — empty set ⇒ only `isLoopbackHost` passes (test case 1)
- [x] Master logs `http://<trusted-host>:<port>/overview` on start when the allowlist is non-empty — `runMaster` in `index.ts` (`LAN:` line per host, `:port` stripped from the env value)
- [x] Loopback is always trusted regardless of the env — `isTrustedHost` short-circuits on `isLoopbackHost` (test: loopback → 200 with env set)
- [x] **Goal met (review round 1, option B):** Start / New project / fs-list also work from an allowlisted LAN host — their hard `remoteAddress`-loopback gate was removed so they're governed by `isTrustedLocalRequest` (allowlist-aware). `register` stays loopback-only by design.

## Quality gates

- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (changed files clean)
- [x] Related tests pass (`npm test` → 351, +1)
- [x] No regressions in affected area (master-liveness 18/18, stable ×2; full suite 351/351)
- [~] Security review: reasoned self-check below; formal pass deferred to `/task-review`. Widening is bounded to the explicit allowlist — a cross-origin `Origin` is still rejected (CSRF), and a rebound request still carries the attacker's own hostname, not the allowlisted LAN IP (DNS rebinding). Loopback default is byte-identical when the env is unset.

## Verification

- [x] With `INSIGHT_FLOW_TRUSTED_HOSTS=<host>`: a gated endpoint (`/api/hub/projects`) with `Host: <host>` (+ same-origin `Origin`) → 200 — test
- [x] Non-allowlisted `Host` → 403; cross-origin `Origin` (with trusted `Host`) → 403 — test
- [x] Without the env: an allowlist-candidate `Host` → 403 (default unchanged) — test case 1
- [ ] Live: phone on the LAN can Start / New project / refresh at `http://<lan-ip>:6100/overview` — manual (recommended during review; requires a phone on the LAN)
- [x] New tests cover allowlisted-pass + non-allowlisted-fail + default-fail — `master-liveness.test.mjs` "N223: …"
