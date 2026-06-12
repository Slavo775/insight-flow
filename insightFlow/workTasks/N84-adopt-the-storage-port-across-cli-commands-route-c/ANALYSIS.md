# N84 — Analysis (pre-taskmaster strategist trail)

> Produced by `/task-analyze`. Follow-up to N81 (review finding #2). **Lowest urgency of the three.** North Star: **"lean now, scale deliberately."**

## Problem framing

N81 introduced a `Storage` port (`core/storage-port.ts` + `jsonFileStorage`) but adoption is minimal: only `cli.ts`'s master-load goes through it; ~120 direct `storage.ts` free-function call sites remain across `cli/cli.ts` + `cli/commands/*`. Until callers route through the port, swapping the storage backend isn't a single-point change — so the seam's payoff is currently unrealized.

## Goal

Route the CLI + command call sites through `jsonFileStorage` (the `Storage` port), behavior-preserving, so a future backend is a one-point swap.

## Options considered

**Adoption style**
- **Import the `jsonFileStorage` singleton per module** *(leaning recommendation)* — lowest churn, behavior-identical, no signature changes. A future swap replaces what the modules import (or the singleton's binding).
- **Dependency-inject a `Storage` through command signatures** — cleaner, makes the swap explicit and testable, but touches every command signature (~13 files) and `cli.ts`'s dispatch. Arguably over-engineering until a *second* backend actually exists.

**Whether to do it now at all**
- This is the one place to be honest about YAGNI: the seam already *exists*. Broad adoption only pays off when a real alternative backend (SQLite, a service) is on the table. If none is planned, N84 is reasonably **deferrable** — flagged so the human can decide.

## Decision

If pursued, adopt the **singleton-import** style (lean, behavior-preserving), verified by the existing `node:test` suite. Recommend confirming a real backend need before scheduling; otherwise hold. Independent of N82/N83.

## Open questions

- **Is an alternative storage backend actually coming?** If not, consider deferring N84.
- Singleton import vs dependency injection.
- Whether side-file/util helpers in `storage.ts` (outside the current `Storage` port surface) should join the port.

## Sources

- N81 `core/storage-port.ts` (`Storage` interface + `jsonFileStorage`, `typeof`-derived signatures).
- N81 REVIEW.md finding #2 ("Storage seam adoption is intentionally minimal … track the migration").
- ~120 call sites across `cli/cli.ts` + `cli/commands/*`.

## Handoff brief

> **Title:** Adopt the Storage port across CLI commands — route call sites through jsonFileStorage · **Type:** rework · **Priority:** medium
> Migrate the ~120 direct `storage.ts` call sites in `cli.ts` + `cli/commands/*` onto `jsonFileStorage`, strictly behavior-preserving, so a future backend swaps at one point. Out of scope: implementing a new backend; N82 (lint); N83 (transport). Confirm a real backend need before scheduling.
