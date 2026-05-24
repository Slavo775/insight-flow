# N24 — Fix hook registration format for Claude Code settings schema — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-24
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Six targeted line changes across two files update all three hook installers (`installActivityHook`, `installEnrichmentHooks`, `installNotifyHook`) to write the new Claude Code settings schema format (`{matcher, hooks:[{type,command,timeout}]}`) instead of the old flat `{command,timeout}` shape. Each installer's `alreadyRegistered` check was also widened to detect both old and new formats, preserving idempotency. Version bumped 0.5.0 → 0.5.1. Low risk — no logic change, pure format migration, verified end-to-end in a fresh temp project.

## Checklist verification

- [x] `installActivityHook` writes `{ matcher: "", hooks: [{type:"command", command, timeout}] }` for `PostToolUse` — **pass** (`activity-hook.ts:130`)
- [x] `installEnrichmentHooks` writes same shape for `UserPromptSubmit`, `Stop`, `PreToolUse` — **pass** (`activity-hook.ts:253`)
- [x] `installNotifyHook` writes same shape for `Stop` — **pass** (`notify-hook.ts:146`)
- [x] Detection recognises both old (`h.command`) and new (`h.hooks[].command`) — **pass** (all three `alreadyRegistered` blocks updated; `settingsRegistersHook` was already dual-format-aware and unchanged)
- [x] Patch version bumped — **pass** (`0.5.0 → 0.5.1`)
- [x] `pnpm build` passes — **pass**
- [x] Fresh `insight-flow init` in `/tmp` produces 5 entries, all new format — **pass**
- [x] Re-running `insight-flow init` leaves entry count at 5 (no duplicates) — **pass**

## Blockers

None.

## Non-blocking

- The pre-existing `settingsRegistersHook` function (used by `detectActivityHookStatus`, exported for external callers) was already dual-format-aware before this PR. No change needed there — good defensive prior art.
- No test covers the written hook format. Worth adding to the init integration test suite in a follow-up (out of scope for this fix).

## Security & edge cases

None — settings.local.json is local developer config, not an attack surface.

## Notes

- Consumer projects with old-format entries already on disk will still trigger the Claude Code validator error until they re-run `insight-flow init`. The fix only affects new installs and re-runs after upgrading to 0.5.1.
- The `debugger-pro-plus-3000` project already had its settings corrected manually; this fix prevents the same issue in future `init` runs.


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-24
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

approved!
