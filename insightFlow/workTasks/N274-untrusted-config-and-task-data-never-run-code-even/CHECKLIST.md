# N274 — Untrusted config and task data never run code — events.hooks trust, confined paths, notify, mrUrl, CSP — Checklist

## Done criteria

- [ ] `events.hooks` commands run only after `insight-flow trust-hooks` approved their exact hash for this project (A13)
- [ ] `rolesDir`, `workDir` and `activityEngine.logFile` outside the project root fail config load with a clear error (A33)
- [ ] Langfuse never combines a config host with env keys (A33)
- [ ] Windows notify passes text through environment variables; no interpolation into `-Command` (A34)
- [ ] `mrUrl` must be http(s) on write; the dashboard renders a link only for http(s) and plain text otherwise (A39)
- [ ] Both markdown sites use a sanitize schema without remote images (A38)
- [ ] Dashboard HTML responses send CSP, `X-Content-Type-Options: nosniff` and `Referrer-Policy` (A38)
- [ ] `/overview` escapes and validates `master.url` (A78)
- [ ] Session ids outside `[A-Za-z0-9_-]{1,128}` never reach a file path (A81)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`log-event`, `notify`, `observability-langfuse`, `security-migration`, `e2e-smoke` green; the dashboard renders under CSP standalone and through the hub)

## Verification

- [ ] Tests cover untrusted vs trusted hooks, a path outside root, Langfuse source mixing, a `javascript:` mrUrl, CSP headers, img sanitizing and session-id traversal
- [ ] Manual: the `touch /tmp/if-hook-ran` hook does not run before `trust-hooks` and runs after
- [ ] Manual: a remote image in `REVIEW.md` triggers no network request
