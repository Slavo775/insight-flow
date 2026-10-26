# N274 — Untrusted config and task data never run code — events.hooks trust, confined paths, notify, mrUrl, CSP — Checklist

## Done criteria

- [x] `events.hooks` commands run only after `insight-flow trust-hooks` approved their exact hash for this project (A13)
- [x] `rolesDir`, `workDir` and `activityEngine.logFile` outside the project root fail config load with a clear error (A33)
- [x] Langfuse never combines a config host with env keys (A33)
- [x] Windows notify passes text through environment variables; no interpolation into `-Command` (A34)
- [x] `mrUrl` must be http(s) on write; the dashboard renders a link only for http(s) and plain text otherwise (A39)
- [x] Both markdown sites use a sanitize schema without remote images (A38)
- [x] Dashboard HTML responses send CSP, `X-Content-Type-Options: nosniff` and `Referrer-Policy` (A38)
- [x] `/overview` escapes and validates `master.url` (A78)
- [x] Session ids outside `[A-Za-z0-9_-]{1,128}` never reach a file path (A81)

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow run lint` passes
- [x] `pnpm --dir packages/taskflow test` passes
- [x] No regressions in affected area (`log-event`, `notify`, `observability-langfuse`, `security-migration`, `e2e-smoke`, full suite 410/410 green). NOTE: the CSP was chosen to be app-safe (`'unsafe-inline'` kept for script/style because styled-components + the hub's injected inline `__IF_BASE__` script need it); a live browser render under the CSP was NOT exercised by the automated tests and is worth a manual smoke-check.

## Verification

- [x] Tests cover: untrusted vs trusted hooks (CLI round-trip), a path outside root, `master.url` validation, Langfuse source mixing, a `javascript:` mrUrl, and the CSP header. NOT covered by an automated test (verified by code review): the client sanitize schema dropping `img` (it is a client-bundle module, not importable from dist) and session-id traversal
- [x] Automated: the hook does not run before `trust-hooks --yes` and runs after (test/config-trust.test.mjs)
- [ ] Manual (human): a remote image in a TASK.md/REVIEW.md triggers no network request, and the dashboard renders correctly under the CSP
