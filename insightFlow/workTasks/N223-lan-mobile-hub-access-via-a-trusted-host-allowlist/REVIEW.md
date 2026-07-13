# N223 — LAN/mobile hub access via a trusted-host allowlist — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-13
**PR:** (no PR yet — branch `dashboard-improvements`, not yet committed)
**Verdict:** fix-needed

## Summary

The `isTrustedLocalRequest` widening is implemented **correctly and safely** — parsing is robust, the default (env unset) is byte-identical to pre-N223, and the CSRF / DNS-rebinding defenses are preserved (confirmed by an independent security pass). **But the change does not achieve the task's headline goal.** The four action endpoints the goal names — **Start, New project, the folder browser, and register** — each carry a *second*, stricter gate on `req.socket.remoteAddress` (must be loopback; added in N215/N221 to stop LAN peers from triggering filesystem writes / exec / registrant-controlled url injection). N223 only touched `isTrustedLocalRequest` (the Host/Origin gate), so from a phone those endpoints **still 403** — only the *read* control-plane (`/api/hub/projects`, `/api/hub/refresh`) and the proxy become LAN-reachable. Completing the goal requires relaxing those `remoteAddress` gates, which is a real security escalation and needs an explicit human decision. REQUEST CHANGES. Risk: the widening as-is is safe but incomplete.

## Checklist verification

- [x] `INSIGHT_FLOW_TRUSTED_HOSTS` parsed via `headerHost` normalization — pass (`trustedHostSet()`, `server.ts:303`; empty/whitespace/commas dropped; `host:port`, bare IP, hostname all normalize to the string the guard compares)
- [x] `isTrustedLocalRequest` trusts loopback OR allowlisted for both Host and Origin; `Sec-Fetch-Site` unchanged — pass (`server.ts:338`)
- [x] Empty/unset env → identical to today — pass (empty set ⇒ `isTrustedHost(h,∅) === isLoopbackHost(h)`)
- [x] Loopback always trusted regardless of env — pass
- [~] Master logs `http://<host>:<port>/overview` when allowlist non-empty — implemented (`index.ts:62`), but the log normalizes differently than the guard (non-blocking #1)
- [ ] **Goal: Start / New project / refresh work over the LAN** — **FAIL for Start / New project / fs-list** (Blocker 1). Only refresh + project-list + the proxy are actually LAN-reachable.

## Blockers

1. **HIGH — Goal unmet: Start and New project still 403 from a phone.** The action endpoints run a hard loopback check on `req.socket.remoteAddress` *before* `isTrustedLocalRequest`, and N223 left it untouched:
   - `POST /api/hub/projects/:id/start` — `server.ts:1099-1104`
   - `POST /api/projects/create` — `server.ts:896-902`
   - `GET /api/fs/list` (New-project folder browser) — `server.ts:836-842`
   - `POST /api/register` — `server.ts:694-699`

   A phone's request has a LAN `remoteAddress` (e.g. `192.168.0.50`) ∉ `{127.0.0.1, ::1, ::ffff:127.0.0.1}`, so all four 403 regardless of `INSIGHT_FLOW_TRUSTED_HOSTS`. Net: N223 makes only `/api/hub/projects` + `/api/hub/refresh` (no `remoteAddress` gate) LAN-reachable, plus the already-ungated `/project/*` proxy. So on mobile you can **view** running projects and refresh, but you **cannot Start a stopped project or create a new one** — the exact use cases in the Problem/Goal/Verification.

   **This is a security decision, not a mechanical fix.** Those `remoteAddress` gates were added deliberately (N215/N221) because these endpoints write to the filesystem, `exec` a dashboard, or accept a registrant-controlled url/path. Relaxing them to `isTrustedLocalRequest` means **any device on the LAN** that sends the right Host header can trigger filesystem writes / project spawns on the hub host. Note the allowlist can't be reused for the `remoteAddress` check: the allowlisted value is the *server's* address the phone connects **to** (the Host), not the phone's peer IP — so widening these endpoints means dropping the peer-IP gate and relying solely on the Host/Origin trust check.

   **Options (need human sign-off):**
   - **(A) Keep N223 read-only (recommended safe default):** accept that mobile = view + refresh + use running dashboards, but Start/New-project stay laptop-only. Update TASK.md Goal/Verification to match; add a `notes` line. Lowest risk.
   - **(B) Extend the widening to Start / create / fs-list:** replace their `remoteAddress`-loopback check with `isTrustedLocalRequest(req)` (keep `/api/register` loopback-only — it's genuinely local-dashboard→hub). Meets the full goal but makes filesystem-write/exec endpoints reachable by any trusted-Host LAN client. Requires documenting the expanded trust boundary in N224 and the human explicitly accepting it.

2. **MEDIUM — the new test gives false confidence that "mobile control-plane works."** `master-liveness.test.mjs` (the N223 test) only hits `/api/hub/projects` (no `remoteAddress` gate) and connects via `httpGet({ hostname: "127.0.0.1" })`, so `remoteAddress` is always loopback — the test **structurally cannot** reproduce the phone scenario, yet asserts "mobile/LAN control-plane works." It would stay green even under option (A) where Start/New-project are blocked. **Fix:** after the option-1 decision, (a) soften the assertion wording to what's actually verified (Host/Origin trust widening on a read endpoint), and (b) if option (B) is chosen, add a case exercising `/start` or `/create`; note in a comment that a loopback-socket test cannot cover the `remoteAddress` gate — the manual live phone check (CHECKLIST) is the only thing that can.

## Non-blocking

1. **LOW — startup-log normalization diverges from the guard.** `index.ts:62` uses `.trim().replace(/:\d+$/,"")` while the guard uses `headerHost()`. Uppercase isn't folded and a scheme-prefixed entry (`http://host`) prints `http://http://host:port/overview`. Cosmetic (documented input is bare host / host:port). Fix: derive the logged hosts from the same `trustedHostSet()` so the printed URL and the trusted set never disagree.
2. **LOW — bare IPv6 in the env silently fails to trust (fail-closed).** `headerHost("fe80::1")` throws → dropped; the user must bracket it (`[fe80::1]`). Safe (never over-trusts), but a usability trap worth a doc note in N224.
3. **LOW (pre-existing, not worsened by N223) — same-host/different-port Origin.** The Origin check compares hostname only (port stripped). A hostile service on the *same* allowlisted host but a different port yields a matching Origin hostname; the only remaining block is `Sec-Fetch-Site`, which very old browsers omit. This already held for `127.0.0.1:other-port` pre-N223. Optional hardening: compare Origin against the full `host:port` authority.

## Security & edge cases

Independent security pass: **no HIGH/MEDIUM findings on the widening itself.** The empty-string guard (`if (h)` in `trustedHostSet`) is load-bearing and correctly present — it prevents an env like `","` from inserting `""` into the set, which would otherwise let a request with a *missing* Host pass. DNS rebinding stays closed (a rebound request carries the attacker's hostname, not the allowlisted IP); cross-origin Origin stays rejected (CSRF); `/api/hub/projects` returns only the `toPublicView` projection (no token/url/path leak) so LAN-exposing it reveals only labels + task state. The only security-relevant issue is Blocker 1 — and it's that the change is *too restrictive* to meet the goal, with the fix (option B) being the thing that must be security-reviewed, not the current code.

## Notes

- **Root cause of the gap:** the TASK.md implementation plan described only the `isTrustedLocalRequest` widening and did not account for the separate `remoteAddress` gates on the write/exec endpoints. The plan is insufficient for the stated goal — this needs a scope/security decision before code.
- Gates otherwise green: typecheck, eslint, `npm test` → 351 (+1), master-liveness 18/18 stable ×2.
- Blocks/relates to N224 (docs) — the docs must describe whichever trust boundary option is chosen (esp. if option B: "any LAN device can create/start projects on the hub host").
- Next: **human decision on option (A) vs (B)** → `/task-review-fix`.

---

## Fixes applied (task-review-fix, 2026-07-13)

**Human decision: OPTION B** — Start / New project / folder-browse should work from the phone (accepting that any trusted-Host LAN client can write files / spawn a dashboard on the hub host). Register stays loopback-only.

**Blocker 1 (HIGH — goal unmet) → FIXED.** Removed the hard `remoteAddress`-loopback block from the three write/exec endpoints, so each is now governed by `isTrustedLocalRequest` alone (loopback by default; an allowlisted LAN host passes; DNS-rebinding + cross-origin Origin still rejected):
- `GET /api/fs/list` — `server.ts`
- `POST /api/projects/create` — `server.ts`
- `POST /api/hub/projects/:id/start` — `server.ts`
- `POST /api/register` — **unchanged** (keeps its loopback-only `remoteAddress` gate; it accepts a registrant-controlled url/path = SSRF surface, and dashboards always register from localhost, so widening it isn't needed for the mobile flow — a phone-triggered Start still execs the dashboard *locally*, which registers over loopback).
Endpoint doc-comments updated to describe the N223 trust model (was "loopback-only").

**Blocker 2 (MEDIUM — misleading test) → FIXED.** Split into two honest tests: (1) the Host/Origin trust-gate widening on a read endpoint (wording corrected — no longer claims "mobile control-plane works"); (2) a new "option B" test proving the write-family endpoint (`fs/list`) is now governed by the trusted-host gate (allowlisted Host → reaches handler; non-allowlisted → 403; env-unset → 403). Both tests carry an explicit note that a loopback-socket test's `remoteAddress` is always `127.0.0.1`, so it **cannot** reproduce a real phone's peer IP — the `remoteAddress`-removal / true phone reachability is verified by code review + the manual live check (CHECKLIST).

**Non-blocking (deferred, documented):** startup-log normalization mismatch (LOW, cosmetic), bare-IPv6 must be bracketed (LOW, doc note for N224), same-host/different-port Origin (LOW, pre-existing). Not addressed — out of the blocker scope.

**Gates:** typecheck clean; eslint clean (server.ts, index.ts, test); `npm test` → **352** (+1 vs the review's 351); master-liveness 19/19 stable ×2.

**Verdict after fixes:** ready for re-review. Live phone check (Start + New project from `http://<lan-ip>:6100` with `INSIGHT_FLOW_TRUSTED_HOSTS=<lan-ip>`) recommended before human approval. N224 must document the option-B trust boundary.


---

## Round 2 — fix-needed (regression found + fixed inline)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-13
**Verdict:** fix-needed → fixed (see "Fixes applied" below)

### Summary

Re-review of the option-B fix. The option-B widening itself is correct (register stays loopback-only; browseRoot/realpath confinement intact; `:id`→registry lookup, `spawn` uses a fixed args array with no shell — no command injection; no secret exposure). **But an independent security pass caught a regression the round-1 fix introduced:** removing the `remoteAddress` gate *entirely* from `fs/list` / `create` / `start` broke the **default (env-unset) localhost-only guarantee** for non-browser clients. `isTrustedLocalRequest` is header-only, so a curl-class LAN client can forge `Host: 127.0.0.1` (no Origin/Sec-Fetch) and reach these filesystem-write / exec endpoints even when the user never set `INSIGHT_FLOW_TRUSTED_HOSTS`. REQUEST CHANGES — **fix applied immediately** (peer-IP defense-in-depth) and verified with a direct regression test.

### Checklist verification

- [x] Option B: fs/list / create / start reachable via an allowlisted host — pass (governed by the trust gate; test)
- [x] register stays loopback-only — pass (its `remoteAddress` gate is intact; verified)
- [x] browseRoot/realpath confinement, name-regex, no `..`/symlink escape — pass (unchanged by the widening)
- [x] no command injection / secret exposure in the now-LAN-reachable handlers — pass (independent security pass: fixed `spawn` args, registry-sourced cwd, `toPublicView` responses)
- [x] **Default (env unset) genuinely localhost-only for ALL client types** — **now pass after the fix** (was FAIL — see Blocker 1)

### Blockers

1. **MEDIUM-HIGH — env-unset posture regressed: a forged loopback `Host` from a LAN peer reached the write/exec endpoints.** After round-1 dropped the `remoteAddress` gate, `fs/list` / `create` / `start` were gated only by the header-based `isTrustedLocalRequest`. A non-browser LAN client (`curl -H "Host: 127.0.0.1" http://<hub-lan-ip>:6100/api/projects/create`, no Origin/Sec-Fetch) passes it — so filesystem writes / process spawns / home-dir listing became network-reachable **even with the env unset** (users who never opted into LAN access). The `remoteAddress` peer-IP was the only thing stopping a forged-loopback-Host from a network client; the header check does not replace it for non-browser clients. (Browser attacks stay closed — DNS-rebinding puts the attacker's hostname in `Host`, cross-origin fetches carry `Origin`.)
   **Fix (applied):** added `isTrustedActionRequest(req)` = `isTrustedLocalRequest(req)` **AND** (loopback socket peer **OR** the request targets an *explicitly-allowlisted* host — the loopback shortcut does NOT count). The three write/exec endpoints now use it. Env unset ⇒ empty allowlist ⇒ every non-loopback peer rejected ⇒ genuinely localhost-only for all client types; env set ⇒ a real allowlisted phone (non-loopback peer targeting the allowlisted host) passes.

### Non-blocking

Carried from round 1 (LOW, deferred): startup-log normalization mismatch; bare-IPv6 must be bracketed; same-host/different-port Origin (pre-existing). N224 doc items.

### Security & edge cases

Independent pass beyond the fixed regression: **clean.** `register` genuinely still loopback-gated (SSRF surface closed to the LAN); the `/project/*` proxy cannot reach the `/api/*` write endpoints (it forwards only to the loopback dashboard and hard-404s `/hub/*`); `start`'s `spawn` uses `process.execPath` + a fixed args array (no `shell:true`, cwd from the registry), `initProject` runs no child process; responses carry no token/url/path.

### Notes

- The fix is directly unit-tested (`isTrustedActionRequest` exported + a test asserting: env-unset forged-loopback-Host from a `192.168.0.50` peer → refused; allowlisted phone → allowed; cross-origin → refused). A loopback-socket integration test can't set a non-loopback `remoteAddress`, so this predicate-level test is the meaningful regression guard.
- Next: a final confirmation re-review is advisable, plus the live phone check, before human approval.

---

## Fixes applied (task-review-fix, round 2, 2026-07-13)

**Blocker 1 (MEDIUM-HIGH — env-unset forged-Host regression) → FIXED.** Added `isTrustedActionRequest(req)` in `server.ts` (peer-IP defense-in-depth: header trust AND [loopback peer OR explicitly-allowlisted Host]) and switched `/api/fs/list`, `/api/projects/create`, `/api/hub/projects/:id/start` to it. `register` unchanged. Exported the predicate via the barrel (`master/index.ts`, `index.ts`) and added a direct regression unit test (the loopback-socket integration test can't reach this path).

**Gates:** typecheck clean; eslint clean; `npm test` → **353** (+1 regression test); N223 tests 3/3; master-liveness stable.

**Verdict after fix:** `fixed` — recommend one final confirmation re-review + the live phone check, then human approval.


---

## Round 3 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-13
**Verdict:** approved

### Summary

Final confirmation pass on the round-2 fix. An independent adversarial security review tried to break the `isTrustedActionRequest` gate and **found no bypass** — the forged-`Host` regression is genuinely closed for all client types when the env is unset, and the option-B LAN-allowlist boundary is implemented exactly as accepted. APPROVE.

### Checklist verification

- [x] Env UNSET → write/exec endpoints genuinely localhost-only for ALL client types — verified: `isTrustedActionRequest` ends in `trustedHostSet().has(...)`, empty when unset, so every non-loopback peer 403s regardless of forged Host (`127.0.0.1`/`localhost`/`::1`/missing/casing/whitespace/trailing-dot all still rejected; no `X-Forwarded-*` trusted).
- [x] Env SET → only (a) loopback peers and (b) non-loopback peers whose Host == an explicitly-allowlisted value pass; forged loopback Host from a LAN peer still fails; cross-origin Origin still fails.
- [x] Peer address not spoofable from headers; IPv4-mapped `::ffff:127.0.0.1` covered; undefined/other-loopback forms fail closed (safe).
- [x] `register` keeps its strictest gate (hard `remoteAddress` loopback + `isTrustedLocalRequest`) — SSRF surface closed to the LAN.
- [x] Read endpoints (`/api/hub/projects`, `/api/hub/refresh`) unchanged, token-stripped `toPublicView`, refresh probes only loopback-filtered targets — no secret exposure, no new regression.
- [x] Proxy `/project/*` / `/p/*` cannot reach the gated write/exec logic; project `/hub/*` hard-blocked; proxy SSRF-confined to loopback.
- [x] Regression directly unit-tested (`isTrustedActionRequest`); gates: typecheck, eslint clean, `npm test` → **353**.

### Blockers

None.

### Non-blocking

1. **LOW (pre-existing, NOT N223) — `/api/activity/:projectId` is ungated.** Returns a project's label + last 3 activity events to any LAN peer / cross-origin site (no trust gate). Predates N223 and is unrelated to the write/exec gate. Follow-up: gate it with `isTrustedLocalRequest` for consistency. Worth a small follow-up task.
2. Carried (LOW): startup-log normalization mismatch; bare-IPv6 must be bracketed (N224 doc note); same-host/different-port Origin (pre-existing). And robustness-only: a genuine loopback connection presenting `127.0.0.2` would fail closed on write/exec endpoints (safe, rare).

### Security & edge cases

Independent adversarial pass: **no bypass found.** The peer-IP defense-in-depth (`LOOPBACK_PEERS.has(remote) || trustedHostSet().has(host)`) correctly requires an *explicit* allowlist entry for any non-loopback peer — the loopback shortcut in `isTrustedHost` is deliberately excluded from the peer branch, so a forged loopback Host cannot substitute for a real allowlisted host.

### Notes

- The subsystem is in a good state. Recommend the **live phone check** (Start + New project from `http://<lan-ip>:6100` with `INSIGHT_FLOW_TRUSTED_HOSTS=<lan-ip>`) before/at human approval — it's the only thing a loopback test can't cover.
- N224 must document: the option-B trust boundary + the bare-IPv6 bracket note. Consider a small follow-up task for the ungated `/api/activity/:projectId`.
- Next (gated): human review + live check → `/task-git` merge to `dashboard-improvements`.


---

## Round 4 — approved

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-13
**Verdict:** approved

### Summary

Human words: *"approved merge into base"* — accepted on the strength of the 3-round AI review (option B + the peer-IP defense-in-depth, no bypass found). Merge N223 into `dashboard-improvements`.

### Blockers

None.

### Notes

- Live phone check was **not** performed before approval (approved on review strength). The peer-IP regression is closed + unit-tested; the only thing unverified is the real end-to-end phone flow — can be smoke-tested any time the hub runs with `INSIGHT_FLOW_TRUSTED_HOSTS=<lan-ip>`.
- Follow-ups accepted (non-blocking): N224 docs (trust boundary + bare-IPv6 bracket note); a small task to gate the pre-existing ungated `/api/activity/:projectId`.
- Proceeding to `/task-git` — merge `dashboard-improvements`.
