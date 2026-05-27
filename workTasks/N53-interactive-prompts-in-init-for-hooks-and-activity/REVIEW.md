# N53 — interactive prompts in init for hooks and activity engine — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Adds two yes/no prompts to `insight-flow init` — lifecycle hooks (default yes, zero token cost) and activity engine (default no, ~50 tokens/turn). `initProject` becomes async; `cli.ts` wraps execution in an `async run()` and awaits it. Skip conditions prevent re-prompting on re-runs. Non-TTY / piped input falls back to defaults silently. Low risk: the new code only runs during `init`, all other commands are unaffected.

## Checklist verification

- [x] `initProject` is async; `cli.ts` awaits it — `export async function initProject` at `init/index.ts:44`; `await initProject(...)` at `cli.ts:135`.
- [x] `promptUser` helper uses `node:readline`; respects `process.stdout.isTTY` — `init/index.ts:19-30`; guard at line 20.
- [x] `--yes` / `-y` flag skips all prompts — `cli.ts:134` detects `opts.yes`, `opts.y`, and `opts._` includes `"-y"`; `useDefaults` path at `init/index.ts:233`.
- [x] Re-run on existing configured project skips prompts — `activityAlreadyConfigured` gate at line 235; `lifecycleAlreadyInstalled` gate at line 234.
- [x] Lifecycle hooks question asked first (default yes); hooks installed on yes — lines 238-273.
- [x] Activity engine question asked second (default no); config updated + hooks installed on yes — lines 248-282.
- [x] One-line explanation printed before each prompt — `console.log` at lines 244 and 255.
- [x] `taskflow.config.json` written back with `activityEngine.enabled: true` when activity accepted — lines 260-268.
- [x] Build passes — confirmed during implementation.

## Blockers

None.

## Non-blocking

1. **`enableActivity` initial value is redundant** (`init/index.ts:249`) — `let enableActivity = config.activityEngine?.enabled !== false` is the same expression used inside the `activityAlreadyConfigured` branch on line 251. The initialization is a dead assignment for that branch. Harmless, but slightly confusing to read.

2. **`lifecycleHooksRegistered` uses raw string search** (`init/index.ts:39`) — `raw.includes("lifecycle-session-start.sh")` is a substring match rather than a proper JSON parse. Won't produce false positives in practice (the string is specific enough), but a JSON parse would be more robust if settings files grow complex.

3. **Config write-back loses JSONC comments** (`init/index.ts:262-266`) — if `--examples` was used, the JSONC-annotated config is overwritten with plain JSON when the user accepts activity. The spec acknowledges this is acceptable.

## Security & edge cases

- **Piped stdin with TTY stdout**: `promptUser` gates on `process.stdout.isTTY` per spec. If stdout is a TTY but stdin is piped, `rl.question` would read from the pipe and return. The readline interface closes cleanly either way — no hang risk.
- **Config parse failure on write-back**: `try { diskData = JSON.parse(...) } catch { /* ignore */ }` at line 262 silently swallows parse errors, leaving `diskData = {}`. This would overwrite the config with a minimal object. Unlikely in practice (config was just written moments before), but worth noting.

## Notes

- The `activityAlreadyConfigured` skip is keyed on `onDiskConfig?.activityEngine?.enabled !== undefined`. A freshly written config (even one with `enabled: false`) satisfies this on re-run, which is the correct "don't re-ask" behaviour.
- `--yes` defaults: lifecycle=yes, activity=no — matches spec Goal #3 and the checklist.
- No changes needed before merge.

---

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-27
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

approved
