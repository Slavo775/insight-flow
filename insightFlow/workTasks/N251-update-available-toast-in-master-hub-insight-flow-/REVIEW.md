# N251 — Update-available toast in master hub + insight-flow update CLI — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-18
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Solid, tightly-scoped implementation that matches the analysis: informational-only toast (option A), global-only CLI (option 1a), reused rollout agent, npm `latest` treated as untrusted data. The security core holds — no injection/RCE path, `execFileSync` fixed-literal argv, `SEMVER_RE` rejects the `"1.0.0; rm -rf ~"` case (no ReDoS), banner is React text-bound (no XSS). Two blockers before merge: a caching bug that makes one transient npm failure suppress the toast for the full 12h TTL, and an ungated `/api/version` endpoint that is inconsistent with the task's security-first framing (every sibling `/api/*` read gates with `isTrustedLocalRequest`). Everything else is non-blocking.

## Checklist verification

- [x] `updateCheck` on `MasterServerConfig` + Zod schema, default `{ true, 12 }` — pass
- [x] `fetchLatestVersion()` interval-cached, silent-`null` on error, skipped when disabled — pass (but see Blocker 1: null is cached for the full TTL)
- [x] `GET /api/version` → `{ current, latest, updateAvailable }`, `latest` semver-validated — pass (but see Blocker 2: ungated)
- [x] Hub fetches `/api/version` on load, renders banner when `updateAvailable` — pass
- [x] Banner dismissible; dismissed version in `localStorage` (`tf-dismissed-update`), no re-nag same `latest` — pass
- [x] `insight-flow update` CLI: global install + hub-project list + rollout pointer — pass
- [x] No web endpoint executes install; `latest` never shell-interpolated — pass
- [x] README documents command + config — pass

## Blockers

1. **Transient npm failure suppresses the update check for the full TTL (12h).**
   `packages/taskflow/src/master/server.ts:809` — `fetchLatestVersion` caches the result unconditionally, including `null` from a timeout/network error (`latestCache = { value, at: Date.now() }`). One brief npm blip — or the master starting while offline — blocks all update detection for up to `intervalHours`, even after the network recovers. The spec caches the *successful* lookup ~12h and wants failures *silent*, not *sticky*.
   **Fix:** only cache success — `if (value !== null) latestCache = { value, at: Date.now() };` (optionally give `null` a short retry window instead).

2. **`/api/version` is ungated — cross-origin version disclosure, inconsistent with the security-first goal.**
   `packages/taskflow/src/master/server.ts:~956` — the route has no `isTrustedLocalRequest(req)` check, while the server sets `Access-Control-Allow-Origin: *` and the sibling read endpoints (`/api/logs` at `:1093`, hub start, fs/list) all gate with it. Any cross-origin page or LAN peer can read the hub's installed `current` version (fingerprinting a known-vuln version) and poke the npm lookup. Both review passes flagged this. The legitimate hub client fetches same-origin, so gating does not break it (`isTrustedLocalRequest` passes `same-origin`/`none`).
   **Fix:** add `if (!isTrustedLocalRequest(req)) { res.writeHead(403); res.end(); return; }` at the top of the route, matching `/api/logs`.

## Non-blocking

1. **Config shallow-merge drops nested `updateCheck` fields.** `config.ts:30` — `{ ...DEFAULTS, ...parsed.data }` replaces the whole `updateCheck`; a user writing `{ enabled: false }` loses `intervalHours: 12` (becomes `undefined`) even though the return type is `Required<MasterServerConfig>`. No runtime bug today (route defends with `?? 12`, and `enabled:false` skips the lookup), but the type lies. Suggest `updateCheck: { ...DEFAULTS.updateCheck, ...parsed.data.updateCheck }`.
2. **`semverGt` ignores prerelease/build.** `server.ts:777` compares only the three numeric segments, so a stable `latest` over a prerelease `current` never flags `updateAvailable`, and equal `x.y.z` are treated equal regardless of pre-release. Acceptable because npm's `latest` dist-tag is conventionally stable — noting the divergence only.
3. **`SEMVER_RE` tolerates a trailing newline** (no `m` flag, `$` matches before final `\n`). Cosmetic — value is only JSON-serialized/React-escaped/numerically compared, never shell-bound. Tighten to `/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/` if strict.

## Security & edge cases

- Posture confirmed by the security pass: no shell (`execFileSync` literal argv), no SSRF (hardcoded registry URL, no user input), 3s abort + cache prevents cross-origin DoS amplification, `SEMVER_RE` is anchored/linear (no ReDoS) and rejects command-injection payloads, banner is text-bound (no `dangerouslySetInnerHTML`), `localStorage` only stores/compares the string.
- `currentVersion()` fails to `"0.0.0"` (biases toward showing the toast) — benign; the shipped package.json is always present. INFO only.

## Fix round 1 (task-review-fix, 2026-07-18)

- **Blocker 1 — FIXED** (`server.ts` `fetchLatestVersion`): now `if (value !== null) latestCache = ...` — a transient npm failure is no longer cached, so the next request retries instead of being suppressed for the TTL. Verified: first call (forced failure) returns `null` and does **not** cache; second call retries npm and returns `99.9.9` / `updateAvailable: true`.
- **Blocker 2 — FIXED** (`server.ts` `/api/version`): added `if (!isTrustedLocalRequest(req)) { 403 }` at the top of the route, matching `/api/logs`. Verified: cross-origin request → `403`; same-origin hub fetch → `200`.
- Non-blocking items (config deep-merge, semver prerelease, `SEMVER_RE` newline) left as noted — not authorized, no runtime impact.
- Gates: tsc ✅ · eslint ✅ · prettier ✅ · 369/369 tests ✅.

## Notes

- Verified end-to-end during implementation: valid-higher → toast, network-error → silent null, disabled → no call, non-semver → rejected. Blocker 1 is the gap those checks didn't cover (the *persistence* of the null, not the null itself).
- Both blockers are small, localized fixes in `server.ts`. Related: N250 (release/publish), `task-release-rollout` (the actuator this points at).

## Round 2 (re-review, 2026-07-18) — APPROVED

Both round-1 blockers are fixed in the current diff:

- **Blocker 1 — verified fixed** (`server.ts:811`): `if (value !== null) latestCache = { value, at: Date.now() };` — a `null` from a timeout/network error is no longer cached, so the next request retries instead of being suppressed for the TTL. Success is still cached for `intervalHours`.
- **Blocker 2 — verified fixed** (`server.ts` `/api/version`): route now opens with `if (!isTrustedLocalRequest(req)) { res.writeHead(403); res.end(); return; }`, matching the sibling `/api/*` reads. Same-origin hub fetch is unaffected.

Re-checked the whole diff, not just the two spots: `update.ts` uses `execFileSync("npm", ["i","-g","insight-flow@latest"])` (fixed literal argv, no shell) and lists `bulkRegistered` hub projects; the client banner is React text-bound (`<strong>{updateVersion}</strong>`, no `dangerouslySetInnerHTML`) and only advertises a server-validated semver; `fetchVersion` failures are swallowed (`.catch(() => {})`) so a failed check just yields no toast.

Non-blocking items from round 1 (config shallow-merge on `updateCheck`, `semverGt` ignoring prerelease, `SEMVER_RE` trailing-newline tolerance) remain as noted — no runtime impact, not authorized to change.

Gate: `npx tsc --noEmit` ✅.


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-18
**Verdict:** approved

> approved!

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

Human sign-off after the AI round-2 re-review confirmed both blockers fixed.
