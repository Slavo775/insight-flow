# N223 — LAN/mobile hub access via a trusted-host allowlist

**Type:** feat
**Priority:** medium
**Created:** 2026-07-12

## Problem

The hub is designed as an installable PWA you'd open on your phone, but N221's `isTrustedLocalRequest` guard only trusts loopback (`localhost`/`127.0.0.1`/`::1`). Accessed over the machine's LAN IP (e.g. `http://192.168.0.77:6100`), the overview page loads but the entire control-plane — `Start`, `New project`, `/api/hub/refresh`, `/api/hub/projects`, `fs/list`, `register` — returns **403**, because the browser's `Host`/`Origin` is the LAN IP, not loopback. So the PWA's headline mobile use case (start/switch/create projects from your phone) doesn't work.

## Goal

1. An **opt-in** `INSIGHT_FLOW_TRUSTED_HOSTS` env lets the user allow specific extra hosts/IPs (their LAN IP or hostname) as trusted origins for the hub control-plane.
2. When set, a same-origin request from `http://<trusted>:6100` passes `isTrustedLocalRequest` (Host **and** Origin checks), so Start / New project / refresh work over the LAN / on mobile.
3. **Default unchanged + still secure:** empty env = localhost-only exactly as today; a cross-origin attacker's `Origin` is still rejected; DNS rebinding still fails (the rebound request carries the attacker's hostname, not the allowlisted LAN IP).
4. The master prints the reachable LAN URL(s) on start when trusted hosts are configured.
5. Build, typecheck, tests, and a security review are green.

## Scope

### In scope

- `packages/taskflow/src/master/server.ts` — parse `INSIGHT_FLOW_TRUSTED_HOSTS` (comma-separated host or `host:port`, hostname or IP) into a trusted-host set; extend `isTrustedLocalRequest` so both the `Host`-header check and the `Origin` check accept loopback **or** an allowlisted host. Keep loopback always trusted.
- `packages/taskflow/src/master/index.ts` (or `server.ts` startup log) — when trusted hosts are set, log `http://<host>:<port>/overview` for each, so the user knows the mobile URL.
- Tests in `packages/taskflow/test/master-liveness.test.mjs`.

### Out of scope

- The docs (that is N224 — it describes this feature once it exists).
- Any change to the loopback default, the proxy, or the per-project token model.
- HTTPS / auth for the hub (a trusted host is still unauthenticated on the LAN; document the trust boundary in N224, don't add auth here).
- Auto-detecting/allowing all LAN IPs — trust must be **explicit** (env), never implicit.

## Implementation plan

1. **Parse the allowlist.** Add a helper that reads `process.env.INSIGHT_FLOW_TRUSTED_HOSTS`, splits on `,`, trims, and normalizes each to a hostname via the existing `headerHost` (so `192.168.0.77:6100` and `192.168.0.77` both yield `192.168.0.77`; `myhub.local` yields `myhub.local`). Build a `Set<string>` computed once (or per-request cheaply).
2. **Extend the trust check.** In `isTrustedLocalRequest`, replace the two `isLoopbackHost(...)` gates with `isTrustedHost(...)` = `isLoopbackHost(h) || trustedHosts.has(h)`, for both the `Host` header host and the `Origin` host. The `Sec-Fetch-Site` check is unchanged (`same-origin`/`none` only). Net: a same-origin request from an allowlisted host passes; a cross-origin request (Origin ≠ allowlisted/loopback) still fails.
3. **Startup log.** In `runMaster` (or the server's listen callback), if the allowlist is non-empty, print each `http://<trusted-host>:<port>/overview` alongside the localhost URL.
4. **Tests.** With `INSIGHT_FLOW_TRUSTED_HOSTS` set to a test host: a request with `Host: <trusted>` (+ same-origin `Origin`) → 200 on a gated endpoint (e.g. `/api/hub/projects`); a request with a non-allowlisted `Host` → 403; a cross-origin `Origin` (not allowlisted) with a trusted `Host` → still 403 (the Origin gate). Env restored in `finally`.
5. **Security review.** Confirm the widening is bounded to the explicit allowlist and doesn't reopen DNS-rebinding (attacker Host is their own hostname) or cross-origin reads (attacker Origin rejected).

## Verification

- `INSIGHT_FLOW_TRUSTED_HOSTS=192.168.0.77 insight-flow master --port 6100` → from a phone on the LAN, `http://192.168.0.77:6100/overview` loads AND Start / New project / refresh work (no 403).
- Without the env: `curl -H "Host: 192.168.0.77:6100" localhost:6100/api/hub/projects` → 403 (unchanged default).
- `cd packages/taskflow && npx tsc --noEmit && npm test` green (+ new allowlist tests).

## Notes

- **Decision (review round 1, human — option B, 2026-07-13):** The original plan (widen only `isTrustedLocalRequest`) was insufficient — `/api/fs/list`, `/api/projects/create`, and `/api/hub/projects/:id/start` each had a *separate* hard `remoteAddress`-loopback gate (N215/N221) that a phone's LAN peer IP fails. To meet the Start/New-project goal, those three gates were **removed** so the endpoints are governed by `isTrustedLocalRequest` alone (allowlist-aware). `/api/register` intentionally keeps its loopback-only gate (registrant-controlled url/path = SSRF surface; dashboards register from localhost anyway). **Trust boundary (N224 must document):** with `INSIGHT_FLOW_TRUSTED_HOSTS` set, **any device on the LAN that can reach the port with the right Host can create/start projects (write files + spawn processes) on the hub host** — use only on trusted networks.
- Builds directly on N221's `isTrustedLocalRequest` / `headerHost` (`master/server.ts`).
- Security framing: the LAN is a semi-trusted network; the allowlist is the user's explicit statement "trust this host." A remote website still can't forge the `Host` to a specific LAN IP from a browser (the page would have to be served from that origin = the hub itself), and cross-origin `Origin` is rejected — so no new remote attack surface. N224 must document the trust boundary (anyone on the LAN who can reach the port has hub control; use only on trusted networks).
- Prereq for N224 (docs describe the working mobile flow this enables).
