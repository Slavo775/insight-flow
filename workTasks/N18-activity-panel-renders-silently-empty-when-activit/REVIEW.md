# N18 — Activity panel renders silently empty when activity hook is not installed — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-22
**PR:** https://github.com/Slavo775/insight-flow/pull/11
**Verdict:** approved

## Summary

The hook installer is extracted from `init/index.ts` into a new shared module `packages/taskflow/src/activity-hook.ts` exposing `detectActivityHookStatus()`, `installActivityHook()`, and `ACTIVITY_HOOK_SCRIPT`. `server/index.ts` computes `hookStatus` at boot, logs it, and ships it (with `configEnabled`) in the WS snapshot. `dashboard.ts` renders a clear `.activity-empty-state` card with the exact retrofit command (`insight-flow install-activity-hook`) when the hook is missing, and removes the card on the first event. When `activityEngine.enabled === false` the panel is hidden and the top-bar shows an `Engine: off (config)` chip so the state is explicit. The new `install-activity-hook` subcommand is idempotent, preserves unrelated PostToolUse hooks (test asserts this), and is documented in the README under "Enabling the activity panel". Risk is low: behaviour for projects that already had the hook installed is unchanged (`init/index.ts`'s `generateActivityHook` now delegates and prints the same log line); the new code paths are gated on `hookStatus !== "ok"`.

## Checklist verification

- [x] Server computes `hookStatus` at startup and logs it once — `server/index.ts` `detectActivityHookStatus(process.cwd())` returns one of `ok | hook-missing | settings-missing | both-missing`; the `Hook: <status>` line appears in the boot output after `Engine: …`. Live boot logged `Hook: both-missing` correctly.
- [x] WS snapshot includes `hookStatus` and `configEnabled` — `server/index.ts` snapshot payload extended; WS probe returned `{ activity: [], hookStatus: "both-missing", configEnabled: true }`.
- [x] Dashboard renders empty-state when `hookStatus !== "ok"` and no events — `dashboard.ts` `renderActivityEmptyState()` appends `.activity-empty-state` to the feed; called from snapshot handler and from `toggleActivity()` on open.
- [x] Empty-state copy includes the retrofit command and disappears on first event — `addActivityEvent()` removes any `.activity-empty-state` element before appending the new item.
- [x] `insight-flow install-activity-hook` subcommand exists, registered, idempotent — `commands/install-activity-hook.ts` + `cli.ts` switch entry; `test/activity-hook.test.mjs` asserts fresh-install (`result: "installed"`), second-run (`result: "already-installed"`), and unrelated-hook preservation.
- [x] `generateActivityHook` refactored into a reusable helper consumed by both call sites — `init/index.ts` `generateActivityHook()` now calls `installActivityHook()` and prints the original log line based on the returned flags.
- [x] `Engine: off (config)` chip when config disables engine — `dashboard.ts` top-bar renders `<span class="engine-chip engine-off">` when `activityEnabled === false`.
- [x] README has an "Enabling the activity panel" section — added between the config table and the slash-commands section; lists the three states (automatic via init, retrofit via subcommand, disabled via config).

## Blockers

_None._

## Non-blocking

1. **Dead-code-ish mkdir in `installActivityHook`.** `activity-hook.ts:133–135` re-creates `.claude/` before writing settings, but `mkdirSync(hooksDir, { recursive: true })` on line 95 already created it implicitly. Safe but redundant — drop it on the next pass.
2. **`detectActivityHookStatus` has no direct unit test.** The smoke tests exercise the installer side end-to-end; detection is indirectly proven by the live boot log returning `both-missing` for this repo. A four-case table test (one per status) would close that gap and protect against future regressions on the detection logic (e.g. someone adding a third candidate settings file).
3. **Slightly awkward copy for the `settings-missing` state.** `dashboard.ts` `activityEmptyStateMessage()` for `settings-missing` reads "Activity hook registered settings missing" as the headline — clearer wording: "Hook script exists but is not registered in settings".
4. **`installActivityHook` only writes to `.claude/settings.local.json` but detection accepts either `.local.json` or `.json`.** If a teammate added the entry to a committed `.claude/settings.json`, status detect returns `ok` and the installer correctly no-ops on the script side, but if `settings.json` and `settings.local.json` both lack the entry the installer always creates `.local.json`. That is the intended behaviour (per-user override file) — worth a one-line comment in `installActivityHook` to record the intent.

## Security & edge cases

- The empty-state copy is escaped via `escHtml()`, and the static HTML (`<code>insight-flow install-activity-hook</code>`, hint text) is hard-coded — no injection vector.
- `settingsRegistersHook()` defensively returns `false` on JSON parse failures, so a malformed settings file just means "not registered" — the empty-state will appear, which is the correct behaviour.
- `installActivityHook()` reads then rewrites the entire settings file. If a teammate edits the file between read and write, the change is lost — acceptable for a one-shot setup command but worth knowing.

## Notes

- This task closes the UX gap N02 left open for users who bypass `insight-flow init` (global install, fork from an existing project without the hook, etc.).
- The empty-state hook is the right place to hang the future browser-notifications opt-in UI — when the hook is installed but notifications are off, the same panel surface can offer "Enable browser alerts for this project?"


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-22
**Verdict:** fix-needed

### Summary

Human spotted an inconsistency the AI review missed: `insight-flow install-activity-hook` ignores `activityEngine.enabled` in the config. `insight-flow init` correctly respects the setting (`init/index.ts:197` — `if (config.activityEngine?.enabled !== false) generateActivityHook(...)`), but the new subcommand from N18 (`commands/install-activity-hook.ts`) always installs regardless of the config.

### Blockers

1. **`install-activity-hook` must respect `activityEngine.enabled === false`.**
   - **Why:** the user's exact words — *"what if I have in config to don't want to have the activity hook? Still it's installed activity hook?"* If a project has explicitly opted out of the activity engine via `taskflow.config.json`, running `insight-flow install-activity-hook` should not silently override that choice.
   - **Where:** `packages/taskflow/src/commands/install-activity-hook.ts` — `cmdInstallActivityHook` calls `installActivityHook()` unconditionally with no check on `config.activityEngine?.enabled`.
   - **Fix:** before calling `installActivityHook`, check `config.activityEngine?.enabled`. If `false`, exit with a clear message — e.g. `Activity engine disabled in taskflow.config.json (activityEngine.enabled: false). Re-enable it in the config before running this command, or pass --force to install anyway.` Match `init`'s guard so the two entry points behave consistently.
   - **Tests:** add a smoke test that sets `enabled: false` in the fixture config and asserts the command refuses (non-zero exit, no `.claude/hooks/` created).

### Non-blocking

_(none from human round)_

### Notes

- This was caught while the AI review was already APPROVED, so the AI round-1 verdict gets superseded by this round-2 fix-needed verdict for tracking purposes.


---

## Round 3 — AI re-review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-22
**Verdict:** approved

### Summary

Round-2 human blocker is resolved. `cmdInstallActivityHook` now reads `config.activityEngine?.enabled` and exits non-zero with a clear stderr message when the engine is disabled, mirroring the guard in `init/index.ts:197`. A `--force` flag escapes the guard for the case where the user wants to install ahead of re-enabling. CLI help text updated. Two new smoke tests cover refusal (no `.claude/` artifacts, non-zero exit, stderr matches `/activityEngine\.enabled: false/`) and the force override. Diff is minimal — 3 source files, ~91 lines added, no unrelated changes. All 5 activity-hook tests + every other test still pass.

### Checklist verification

- [x] **Round-2 blocker fixed.** `commands/install-activity-hook.ts:14` guards on `config.activityEngine?.enabled === false && !force`; refusal exits with `process.exit(1)` and a stderr message naming the config key and the override flag.
- [x] **Behaviour matches `init`.** `init/index.ts:197` skips installation when `enabled === false`; the subcommand now refuses with the same condition. Two entry points are consistent.
- [x] **Escape hatch present.** `--force` is parsed by the existing CLI argv handler and passed via `opts`; `!!opts.force` correctly coerces both the no-value flag form and any string truthiness.
- [x] **CLI help string updated.** `cli.ts:108` reads `install-activity-hook [--force]` with the refusal semantics documented.
- [x] **Tests cover both branches.** `test/activity-hook.test.mjs` — new `refuses when activityEngine.enabled is false` asserts non-zero exit, stderr regex, and absence of both `.claude/hooks/taskflow-activity.sh` and `.claude/settings.local.json`. New `--force overrides activityEngine.enabled=false` asserts `result: "installed"` and hook script existence. `tmpProject({ activityEnabled })` factory was extracted cleanly.
- [x] **No scope creep.** Diff touches only the three files named in the fix-end (`install-activity-hook.ts`, `cli.ts`, `activity-hook.test.mjs`). N17 untouched; no other unrelated edits.
- [x] **Live dogfood proof.** After `insight-flow init` at the repo root with `enabled: true` (the dogfood scenario you just ran), the server boot log shows `Hook: ok` — the install-activity-hook code path was effectively re-validated end-to-end.

### Blockers

_None._

### Non-blocking

1. The 4 non-blocking notes from round 1 (dead-code mkdir in `installActivityHook`, no direct test for `detectActivityHookStatus`, awkward `settings-missing` copy, missing intent comment for the `.local.json`-only writer) remain unaddressed. They were explicitly non-blocking then and stay non-blocking now — flag for a future cleanup pass rather than gating this PR.

### Security & edge cases

- Refusal happens **before** any filesystem write, so a disabled-engine project cannot have its `.claude/` partially mutated when the command refuses. ✓
- `--force` is opt-in only; no env var or implicit override path. ✓

### Notes

- N18 is now ready for merge alongside N17 (also approved). The branch `fix/N17-N18-dashboard-live-updates-and-activity-empty-state` carries both implementations + the round-2 fix + this re-review verdict.


---

## Human Review — Round 4

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Summary

After the N17 Socket.IO fix the dashboard works end-to-end (green dot, real-time file-change broadcasts, snapshot delivered with `hookStatus: "ok"`). But the Claude Activity panel stays empty with the "idle" badge even though the hook is installed and registered. Human's exact words:

> *"still Claude activity is empty"*

Verified diagnosis (server-side):

- `.claude/hooks/taskflow-activity.sh` exists ✓
- `.claude/settings.local.json` has the PostToolUse entry ✓
- Server boot logs `Hook: ok` ✓
- Snapshot delivered to the browser contains `{ "activity": [], "hookStatus": "ok", "configEnabled": true }` ✓
- `.taskflow-activity.jsonl` is **0 bytes** — no events have been emitted ✗

Root cause: the human's Claude Code session was launched **before** `insight-flow init` added the PostToolUse hook to `settings.local.json`. Claude Code reads that file at session start; mid-session edits to the hook registration don't take effect until the next session. So the hook *exists*, the dashboard correctly reports `Hook: ok`, but no actual tool-use events are being written by the running Claude Code session, so the panel stays empty forever.

This is bad UX: the user did everything right (ran `insight-flow init`, server says hook is OK, dashboard agrees), and the panel still shows nothing. The N18 empty-state implementation only handles the `hookStatus !== "ok"` cases — it has no guidance for the "hook installed but no events flowing" case.

### Blockers

1. **Add a "hook installed but no events" empty-state with session-restart guidance.**
   - **Why:** when `hookStatus === "ok"` AND `activityEvents.length === 0`, the panel currently shows just the "idle" badge with no explanation. The most common reason for this state (by far) is "user installed the hook mid-session and Claude Code has not picked it up yet". Without a hint, users will assume the dashboard is broken (which is exactly what happened here).
   - **Where:** `packages/taskflow/src/server/dashboard.ts` — `renderActivityEmptyState()` returns early when `hookStatus === 'ok'`. Extend it to cover the ok-but-empty case.
   - **Fix:**
     - Extend `activityEmptyStateMessage()` to return a non-null message when `hookStatus === 'ok'` and `activityEvents.length === 0`, with copy like:
       > **Waiting for Claude activity** — the hook is installed and the dashboard is connected. If events do not appear, restart your Claude Code session: `settings.local.json` is read at session start, so a hook added mid-session is not picked up until you launch a new session.
     - Defer the empty-state render by ~3 s on first connect so it does not flash briefly before the first real event arrives in an active session. Once the first event lands, `addActivityEvent()` already removes the empty-state card, so the deferred render is harmless when events do flow.
   - **Optional secondary:** in `commands/install-activity-hook.ts`, after a successful fresh install print a one-line hint to stderr/stdout: `"Activity hook installed. Restart your Claude Code session to start streaming events."` Mirror in `init/index.ts`'s `generateActivityHook` success log.
   - **Tests:** extend the existing smoke test or add a new dashboard-level assertion that with `hookStatus: ok` and `activityEvents: []` the rendered HTML for the panel contains the "restart your Claude Code session" copy. Optional — the existing tests are smoke-only.

### Non-blocking

_(none from human round)_

### Security & edge cases

- The new empty-state copy is static text; same `escHtml()` discipline as the existing empty-state, no injection surface.
- The deferred render must be cancelled if the panel is closed before it fires, or it will leak a timer. Use `clearTimeout` in `toggleActivity()` when closing.

### Notes

- This re-opens N18 for a round-4 fix on the same branch (`fix/N17-N18-dashboard-live-updates-and-activity-empty-state`). N17 stays `approved`.
- The deeper alternative — having the activity engine watch `.claude/settings.local.json` for changes and auto-reload, or making Claude Code itself re-read settings on file change — is out of scope. The empty-state guidance is the minimum-viable fix.
