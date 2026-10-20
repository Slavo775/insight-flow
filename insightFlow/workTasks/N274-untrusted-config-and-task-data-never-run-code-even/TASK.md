# N274 — Untrusted config and task data never run code — events.hooks trust, confined paths, notify, mrUrl, CSP

**Type:** fix
**Priority:** high
**Created:** 2026-10-19

## Problem

A cloned repo's `taskflow.config.json` and agent-written task data are treated as trusted:

- `events.hooks` strings run through `sh -c` whenever any agent calls `insight-flow log-event`.
- `rolesDir`, `workDir` and `activityEngine.logFile` can point anywhere on disk; `rolesDir` is even a write and patch target.
- Langfuse takes its `host` from the config but the secret key from env, so a repo config can send the developer's key and task data to any host.
- On Windows, notify text is interpolated into PowerShell, where `$(...)` still runs.
- `mrUrl` is rendered as a link with no protocol check, markdown allows remote images, and neither server sends a CSP.
- `/overview` injects `config.master.url` into HTML unescaped.
- Session ids go into file paths unsanitized.

Source: `N271/AUDIT.md` **A13, A33, A34, A38, A39, A78** (`/overview` part), **A81** (session-id part).

## Goal

1. No shell command from a repo-committed config runs until the human has approved that exact command list once.
2. Every config path resolves inside the project root, or loading fails with a clear error.
3. Langfuse credentials and host always come from the same source.
4. Windows notify cannot execute text from titles or statuses.
5. The dashboard renders only `http(s)` PR links, blocks remote images in markdown, and sends a CSP plus basic security headers on HTML.

## Scope

### In scope

- `packages/taskflow/src/cli/commands/log-event.ts` — `events.hooks` execution (~:335-345), `sessionId` → path (~:88-119).
- `packages/taskflow/src/core/config.ts` — validate the path keys and `master.url` on load.
- `packages/taskflow/src/cli/commands/prompt-build.ts` — `rolesDir` (~:185-224).
- `packages/taskflow/src/core/paths.ts` — `workDir` (:49).
- `packages/taskflow/src/cli/commands/log-activity.ts` — the `logFile` confinement check only.
- `packages/taskflow/src/core/observability/langfuse.ts` — host/key source (~:185-189).
- `packages/taskflow/src/cli/commands/notify.ts` — Windows branch (~:29-37).
- `packages/taskflow/src/core/schema/index.ts` — `mrUrl` (:133).
- `packages/taskflow/src/cli/commands/push.ts` — `mr-update` (:53).
- `packages/taskflow/src/dashboard/client/DetailPanel.tsx` — PR link (:79) and markdown (:305).
- `packages/taskflow/src/dashboard/client/ModuleDetail.tsx` — markdown (:176, 198, 232, 308).
- `packages/taskflow/src/dashboard/server/index.ts` — security headers on HTML responses, `/overview` (~:896-898).
- `packages/taskflow/src/core/http-util.ts` — a small header helper if useful.

### Out of scope

- Host / Origin gates → N272.
- Install confirmation and `include.ref` → N273.
- How log paths resolve to the project root, and log file format → N279. This task only rejects paths that leave the root.
- Strict argument parsing → N278.

## Implementation plan

1. **Trust step for `events.hooks` (A13).** Recommended design: store approvals in `~/.insight-flow/trusted-hooks.json`, keyed by project root and holding a sha256 of the `events.hooks` object.
   - `log-event` runs hooks only when the hash matches. Otherwise it prints one stderr line: "events.hooks not trusted — run `insight-flow trust-hooks`".
   - The new `insight-flow trust-hooks` command prints the exact commands and records the hash after a y/N prompt (or `--yes`).
   - If `/task-analyze` prefers a different design (e.g. moving hooks to a gitignored `*.local.json`), confirm it with the human first.
2. **Confine config paths (A33).** One helper: `resolveInside(root, p, key)` throws `TaskflowValidationError` when `relative(root, resolved)` starts with `..` or is absolute. Apply it to `rolesDir`, `workDir` and `activityEngine.logFile` at config load.
3. **Langfuse source rule (A33).** If the keys come from env, use the host only from `LANGFUSE_HOST` env (or the default), never from config. If they come from config, the host may come from config.
4. **Windows notify (A34).** Pass title and message through environment variables (`$env:IF_T`, `$env:IF_M`) and reference them in the `-Command` script. No string interpolation.
5. **`mrUrl` (A39).** Add an http(s) refine to the schema; `mr-update` rejects other values with a clear error. In `DetailPanel.tsx` render an anchor only when `/^https?:\/\//i.test(mrUrl)`, else plain text. Existing data that fails the refine must still load: validate on write; on read, render as text.
6. **Markdown images + headers (A38).** Use a custom `rehype-sanitize` schema (extend `defaultSchema`, drop `img` or set `protocols.src` to `[]`) in both markdown sites. On every HTML response from the dashboard server, send `Content-Security-Policy` (at least `default-src 'self'; img-src 'self' data:; frame-ancestors 'none'` — confirm the Vite bundle and styled-components work under it; add `style-src 'self' 'unsafe-inline'` if needed), `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. The hub reverse-proxies the dashboard, so check the shell still renders through `/project/<id>/`.
7. **`/overview` (A78).** Validate `master.url` as http(s) at config load and `escHtml` it at `index.ts` ~:896-898.
8. **Session id (A81).** Allow only `[A-Za-z0-9_-]{1,128}` before building any `~/.insight-flow` path; otherwise skip session bookkeeping.
9. **Tests.**
   - Untrusted `events.hooks` do not spawn; trusted ones do (use a hook that touches a temp file).
   - `rolesDir: "/tmp/x"` → config load error.
   - Langfuse host from config is ignored when keys come from env.
   - `mr-update --url "javascript:alert(1)"` → error.
   - The HTML response has CSP + nosniff headers.
   - Sanitize output drops `<img src="https://…">`.
   - Session id `../../x` writes nothing outside `~/.insight-flow`.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new tests.
- Manual: add `"events":{"hooks":{"start":["touch /tmp/if-hook-ran"]}}` to a temp project config → `insight-flow log-event start` does **not** create the file → `insight-flow trust-hooks --yes` → now it does.
- Manual: open a task whose `REVIEW.md` contains `![x](https://example.com/x.png)` → no network request to example.com (DevTools).
- `curl -sI http://127.0.0.1:6006/ | grep -i content-security-policy` → present.

## Notes

- Detail and evidence: `N271/AUDIT.md` A13, A33, A34, A38, A39, A78, A81. A39 was **lowered** from high: with `target="_blank"` and `noopener`, modern browsers most likely ignore `javascript:`. The fix is still cheap.
- Depends on **N272** (same server file, header area) and **N267 merged** (it changes core and CLI files).
- Coordinate with N279 (also edits `log-event.ts` / `log-activity.ts`) and N283 / N285 (also edit `DetailPanel.tsx`). Run this task before them.
- Recommended run: `/task-analyze N274` → `/task-implement N274`.
