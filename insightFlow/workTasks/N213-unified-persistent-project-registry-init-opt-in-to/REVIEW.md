# N213 — Unified persistent project registry + init opt-in to the master hub — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**Verdict:** fix-needed

## Summary

Clean, well-scoped implementation: a Zod-validated `~/.insight-flow/hub.json` with read/write/upsert-by-path/port-assign helpers, an idempotent `migrateBatchUiIntoHub` fold of the legacy list, a `registry.seed` so the master overview lists registered projects offline (reconciling on live register), and an `init` opt-in with `--register-hub`/`--no-register-hub`. Good test (`hub-registry.test.mjs`) + E2E-verified. **One blocker:** the new init prompt ignores the `--yes`/non-interactive contract that every sibling prompt in the same function respects, so `init --yes` on a TTY would block on it.

## Checklist verification

- [x] Persistent `hub.json` + Zod (`HubProjectEntrySchema`/`HubRegistrySchema`) — verified.
- [x] Read/write/upsert/find/assignPort helpers in `global-config.ts` — verified.
- [x] `migrateBatchUiIntoHub` idempotent, no duplicates — tested.
- [x] Master seeds overview from persisted list on boot (`runMaster` → `registry.seed`) — E2E verified.
- [x] `init` opt-in adds entry + free port — E2E verified.
- [ ] **`--yes` behavior** — partially wrong (Blocker 1): non-TTY works, but `--yes` on a TTY prompts.

## Blockers

1. **`init --yes` on a TTY blocks on the new hub prompt — violates the `--yes` / non-interactive contract.**
   - **Where:** `packages/taskflow/src/agents/init/index.ts` — the N213 hub block: `const doRegister = options.registerHub ?? (await promptUser(...))`. Every other init prompt (lines 251–279) is gated by `useDefaults = options.yes || !process.stdout.isTTY` and only calls `promptUser` when `!useDefaults`. This block skips that gate, and `promptUser` only auto-answers when `!isTTY` — so with `--yes` on a real terminal it still prompts and waits.
   - **Why:** `insight-flow init --yes` is meant to be non-interactive; hanging on a question defeats it and is inconsistent with the two prompts right above. (Scripts/CI are non-TTY so they're unaffected, which is why tests didn't catch it — but an interactive `--yes` run hangs.)
   - **Fix:** honor the same gate. `useDefaults` is scoped inside the `claudeSelected` block, so recompute it here:
     ```ts
     const doRegister =
       options.registerHub ??
       (options.yes || !process.stdout.isTTY ? false : await promptUser(...));
     ```
     Re-verify: `init --yes` (TTY) does not prompt and does not register (unless `--register-hub`).

## Non-blocking

1. **Migrated bulk-ui entries may not reconcile.** `registry.seed(p.label, p.label)` uses `label` as the `projectId`, but a live dashboard registers with `projectId = config.projectName`. For init-registered projects `label === projectName` (reconciles ✓); for folded `batch-ui` entries the user-chosen label can differ → a seeded offline entry plus a separate live entry (duplicate in the overview). Noted in TASK.md; fine for now, but N214/N215 should reconcile by `path` or store `projectName` on the hub entry.
2. **`assignHubPort` only avoids ports already in `hub.json`**, not OS-occupied ports — a persisted port could still be busy at launch. Acceptable (launch-time free-port finding is N215/bulk-ui), worth a comment.
3. **One malformed entry drops the whole registry.** `readHubRegistry` `safeParse`s the whole file and returns `[]` on any failure (matches the `batch-ui.json` pattern). Per-entry tolerance would be more robust.
4. **Concurrent writers race.** `upsertHubProject`/`migrate` do read-modify-write without a lock; two simultaneous inits (or init + master seed) could clobber. Low likelihood locally; same pattern as `batch-ui.json`.
5. **`INSIGHT_FLOW_CONFIG_DIR` only redirects `global-config.ts`** (hub.json / batch-ui.json), not `master.lock` / `master.json` (which use `homedir()` directly). The name implies the whole config dir — a short doc/comment would avoid confusion.
6. **`let projects` in `migrateBatchUiIntoHub` is never reassigned** → `prefer-const` (the pre-commit `eslint --fix` will change it).

## Security & edge cases

- Registry lives under `~/.insight-flow/` (or the env override) — never a project dir. Good.
- Hub port assignment + idempotent upsert-by-path are correct and tested.
- No secrets / network surface added here.

## Notes

- **Roadmap Phase 1**, on `dashboard-improvements`. Unblocks N214 (liveness) / N215 (switcher).
- The blocker is a 1-line gate fix. Everything else is solid; gates green (build ✅ · 328/328 ✅ · typecheck ✅).

---

## Fix (2026-07-10, task-review-fix)

- **Blocker 1 — resolved.** The hub prompt now honors the same gate as the sibling prompts: `hubUseDefaults = options.yes || !process.stdout.isTTY` → default **No** (never blocks), unless `--register-hub`. E2E: `init --yes` (no flag) creates no `hub.json`; `init --register-hub --yes` registers.
- **Non-blocking 2 — resolved.** `assignHubPort` doc clarified: stable persisted assignment, not an OS free-port probe (that stays the launcher's job).
- **Non-blocking 3 — resolved.** `readHubRegistry` now validates **per-entry** and drops only the malformed ones (`flatMap` + `HubProjectEntrySchema.safeParse`), instead of discarding the whole list. New test: one bad entry → the valid one still loads.
- **Non-blocking 5 — resolved.** Comment on `INSIGHT_FLOW_CONFIG_DIR` notes it only redirects this module's files (hub.json/batch-ui.json), not master lock/config.
- **Non-blocking 6 — resolved.** `let projects` → `const` in `migrateBatchUiIntoHub`.
- **Non-blocking 1 — deferred (with reason).** Reconciling folded bulk-ui entries needs the live dashboard to send its **path** (it currently sends only `projectId`=projectName), which is a change to the register payload + master endpoint — that belongs with **N214**'s register/liveness rework, not here. The init path (the common one) already reconciles.
- **Non-blocking 4 — deferred (with reason).** File-locking the read-modify-write is over-engineering for a single-user local tool and matches the existing `batch-ui.json` pattern (also unlocked). Left as-is.
- **Gates:** build ✅ · typecheck ✅ · `test:node` **329 / 329** ✅.


---

## Round 2 — AI re-review (fix)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**Verdict:** approved

### Summary

Round-1 blocker fixed and verified; the four in-scope non-blockings resolved; the two deferrals are the right call. **Approved.**

### Checklist verification

- [x] **Blocker 1 fixed.** The hub prompt is now gated by `hubUseDefaults = options.yes || !process.stdout.isTTY` (init/index.ts) → default No, never blocks. E2E: `init --yes` (no flag) writes no `hub.json`; `init --register-hub --yes` registers.
- [x] **NB3 fixed + tested.** `readHubRegistry` validates per-entry (`flatMap` + `HubProjectEntrySchema.safeParse`); a malformed entry is dropped, the rest load. `HubRegistrySchema` import removed (no unused import).
- [x] **NB2/NB5/NB6 fixed.** `assignHubPort` + config-dir override comments; `let`→`const`.
- [x] All original checklist items still pass; registry/migration/seed/init unchanged in behavior.

### Blockers

- None.

### Non-blocking

- **NB1 (bulk-ui reconciliation) — deferred to N214**, correctly: it needs the live dashboard to send its `path` (register payload change), which is part of N214's register/liveness rework. The init path already reconciles.
- **NB4 (write-lock) — deferred**, reasonable: over-engineering for a single-user local tool; matches the unlocked `batch-ui.json` pattern.

### Security & edge cases

- Registry under `~/.insight-flow/` (or the env override); no network/secret surface. Per-entry tolerance improves robustness against a corrupt file.

### Notes

- Clean. Gates: build ✅ · `test:node` **329/329** ✅ · typecheck ✅. Ready for human review → merge into `dashboard-improvements`.


---

## Round 3 — human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-10
**Verdict:** approved

### Summary

"approved" — human sign-off after the fix (blocker + non-blockings, 329/329). Merges into `dashboard-improvements`.

### Blockers

None.

### Notes

- Phase 1 of the PWA hub roadmap complete. Unblocks N214 (liveness) / N215 (switcher).
