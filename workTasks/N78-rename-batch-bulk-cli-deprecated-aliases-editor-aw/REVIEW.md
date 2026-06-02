# N78 — Rename batch→bulk CLI (deprecated aliases) + editor-aware init/bulk via config.editor — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-02
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Two changes in one task: (1) `batch`/`ui-batch-*` → `bulk-*` rename with warning-emitting deprecated aliases (registry file/format untouched), and (2) `config.editor` (claude/cursor/all) threaded into init precedence (flag → config → auto-detect → claude) + a `bulk-init --editor` fleet override. Reviewed the full diff (7 files) + ran all paths. **Low risk** — rename is dispatch-only with aliases; editor change is additive/back-compatible; the load-bearing registry storage (`batch-ui.json`, `{label,path}`) is correctly left untouched.

## Checklist verification

- [x] `bulk-register`/`bulk-unregister`/`bulk-down`/`bulk-ui` are canonical — pass (cli dispatch + help)
- [x] Old names dispatch + warn on stderr — pass (alias map; `batch-ui --list` test asserts the warning)
- [x] `TaskflowConfig.editor` added (config loaded loosely — no Zod schema to change) — pass
- [x] init precedence flag → config → auto-detect → claude — pass (tests: config.editor=cursor scaffolds cursor; --editor claude overrides). Invalid `--editor` fails closed **before** any write (early guard restores N75 behavior).
- [x] `bulk-init` honors per-project `config.editor` (runs each project's init) + `--editor` fleet override — pass (passthrough wired); explicit `--editor` is also persisted into a fresh config.
- [x] Registry storage + `{label,path}` unchanged — pass (`batch-ui.json` filename deliberately kept)
- [x] help + README updated; CLAUDE.md needed none (doesn't reference these commands) — pass

Quality gates: `tsc --noEmit` clean; full suite **14 files `# fail 0`** (incl. new `bulk-editor.test.mjs`, 4 tests).

## Non-blocking

**Resolution (post-review, applied to the uncommitted implementation at the user's request — no fix-needed lifecycle since the review approved):**

- ✅ **#1 fixed** — extracted `buildBulkInitArgs(opts)` (exported) from `cmdBulkInit`; added a unit test asserting `--force`/`--examples`/`--editor` are threaded into the per-project `init` args (no global-registry side effects).
- ✅ **#4 fixed** — renamed the internal `cmd*` command functions `Batch`→`Bulk` (`cmdBulkUi`, `cmdBulkRegister`, `cmdBulkInit`, …) across `batch-ui.ts` + `cli.ts`, completing the rename. The registry helpers (`readBatchUiRegistry`, …) and the registry file (`batch-ui.json`) are intentionally kept — they're load-bearing storage, not user-facing.
- ◻️ **#2 not changed (by design)** — `config.editor` is validated at `selectProviders` time; the early guard already prevents the only partial-write case (a fresh project's invalid `--editor`). No defect; consolidating would mean validating before config is even loaded.
- ◻️ **#3 not changed (deliberate)** — persisting `--editor` into an *existing* config would rewrite it via `JSON.stringify`, **clobbering any `--examples` JSONC comments**. Not worth that regression; auto-detect covers subsequent runs.

Full suite after fixes: 14 files `# fail 0` (bulk-editor: 5 tests).

---

_Original findings (for the record):_

1. **`bulk-init --editor` passthrough not directly tested.** `cmdBatchInit` appends `--editor <v>`, but an end-to-end test needs the global registry + spawns (risky in CI). The precedence + alias warning are tested; the passthrough is a one-liner verified by reading. Consider a unit test that asserts the built `init` args include `--editor` when set.
2. **`config.editor` validated later than the flag.** An explicit `--editor` is validated early (before writes); a hand-edited bad `config.editor` is only caught at `selectProviders` time — fine in practice (existing config → no partial write; a fresh config never gets a bad editor), but the two validations live in different places.
3. **`--editor` on an *existing* project isn't persisted** (only fresh configs record it). One-shot for existing projects; auto-detect covers subsequent runs once `.cursor`/`.claude` exists. Acceptable.
4. **Cosmetic:** internal `cmd*` function names (`cmdBatchUi`, `cmdUiBatchRegister`, …) still say "batch". Harmless (not user-facing); could rename for clarity in a follow-up.

## Security & edge cases

- Invalid `--editor` fails closed before any filesystem writes (verified — no partial config).
- `bulk-init --editor <bad>` → each project's init rejects it and the bulk run reports `✗` per project; no scaffolding. No bulk-level pre-validation, but per-project guard handles it.
- Deprecated aliases only remap a fixed set of names; unknown commands still hit the "Unknown command" path.

## Notes

- Builds on N75 (`selectProviders`/`--editor`) + N76 (`ProviderSchema`). `all` is valid in `config.editor`/`--editor` and maps to both providers via `selectProviders`.
- Aliases are temporary (one release) — add a CHANGELOG note so they can be removed later.
- Reviewed N78 rather than the picker's N67 (high) — N67 is a pre-existing leftover with uncommitted review files, not this branch's work.

## Summary

<one paragraph: what changed, risk level>

## Checklist verification

- [ ] <CHECKLIST.md item> — pass | fail

## Blockers

<numbered list with file refs + line numbers + "Why" + "Fix"; omit section if APPROVED>

## Non-blocking

<suggestions for quality, not required for approval>

## Security & edge cases

<missing validation, error handling, authz gaps; omit if none>

## Notes

<context, follow-ups, related tasks>
