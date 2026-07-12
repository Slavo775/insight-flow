# N223 — LAN/mobile hub access via a trusted-host allowlist — Checklist

## Done criteria

- [ ] `INSIGHT_FLOW_TRUSTED_HOSTS` parsed (comma-separated host / `host:port`, IP or hostname) into a trusted-host set via `headerHost` normalization
- [ ] `isTrustedLocalRequest` trusts loopback **OR** an allowlisted host — for both the `Host` and `Origin` checks; `Sec-Fetch-Site` gate unchanged
- [ ] Empty/unset env → behavior identical to today (localhost-only)
- [ ] Master logs `http://<trusted-host>:<port>/overview` on start when the allowlist is non-empty
- [ ] Loopback is always trusted regardless of the env

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass (`npm test`)
- [ ] No regressions in affected area
- [ ] Security review: no DNS-rebinding / cross-origin regression (widening bounded to the explicit allowlist)

## Verification

- [ ] With `INSIGHT_FLOW_TRUSTED_HOSTS=<host>`: a gated endpoint with `Host: <host>` (+ same-origin `Origin`) → 200
- [ ] Non-allowlisted `Host` → 403; cross-origin `Origin` (with trusted `Host`) → 403
- [ ] Without the env: `curl -H "Host: 192.168.0.77:6100" localhost:6100/api/hub/projects` → 403 (default unchanged)
- [ ] Live: phone on the LAN can Start / New project / refresh at `http://<lan-ip>:6100/overview`
- [ ] New tests cover allowlisted-pass + non-allowlisted-fail + default-fail
