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
