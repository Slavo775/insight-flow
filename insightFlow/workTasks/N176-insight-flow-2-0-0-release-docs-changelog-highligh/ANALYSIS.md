# N176 — Analysis

## Problem framing

The user asked to "change the README and CHANGELOG and all things for documentation of what changed" before publishing v2.0.0. Investigation showed the gap is large: **70 PRs (N81–N174) merged since `v1.0.0`**, but the `[2.0.0]` CHANGELOG (written in N175) documents only 2 of them (N81 + N89). The package README (945 lines) still says "What's new in 1.0.0" and predates the flows/install/composition-v2 era; root README + `docs/` predate the React/Vite rewrite. This is the last docs gate before the v2.0.0 publish that N175's pipeline enables.

## Goal

Make the 2.0.0 docs honestly reflect what shipped — especially the breaking changes — without a noise-wall of per-task entries, so users understand the major before it publishes.

## Options considered

- **CHANGELOG depth:** curated themed highlights vs full per-PR list (~70 lines) vs minimal (breaking + one paragraph).
- **Doc scope:** CHANGELOG only · CHANGELOG + package README · CHANGELOG + both READMEs + docs/.
- **Task shape:** one combined task vs split (CHANGELOG fast, README/docs separate).
- **Source of truth:** `git log v1.0.0..main` PR subjects (authoritative, already conventional+scoped) vs reconstructing from task specs/memory.

## Decision

- **Curated themed highlights** (~8–12 grouped Added/Changed/Fixed bullets) + a **complete** Breaking/Migration section. Rejected the per-PR wall (noise, contradicts the earlier "no backfill" call) and minimal (under-informs a major).
- **Scope = CHANGELOG + package README + root README + docs/** (both READMEs are user-facing and overlap, so consistency matters).
- **One task** — the deliverables are interdependent and all gate the publish.
- **Source of truth = the 70 merged PRs** (`git log v1.0.0..main`, conventional + scoped) plus spot-checks of headline task specs; not memory.

## Open questions

- Whether the `batch*→bulk*` aliases (deprecated in 1.0.0, "kept one more release" per N80) were actually removed this cycle — must be verified during implementation and documented as breaking if so.
- Exact breaking surface of the `insightFlow/` layout migration for existing consumers (what `migrate-layout` does) — pin from N99–N101 specs.
- Whether `docs/local-testing-with-yalc.md` is stale at all (yalc scripts may be unchanged since N136).

## Sources

- `git log v1.0.0..main` → 70 PR-tagged commits; `find insightFlow/workTasks` → N81–N174 folder titles (themes); `packages/taskflow/README.md` (945 lines, "What's new in 1.0.0" at line 7); `README.md` (263 lines, user-facing); `docs/architecture-diagrams.md`, `docs/local-testing-with-yalc.md`; current thin `[2.0.0]` entry in `packages/taskflow/CHANGELOG.md` (N175).

## Handoff brief

docs / high / tags: docs, release, changelog, readme, v2. Rewrite `[2.0.0]` CHANGELOG as curated themed highlights + complete Breaking/Migration (composition v2 + layout migration + alias removal if applicable); update `packages/taskflow/README.md` (what's-new 2.0.0 + flows/install/statuses/composition sections + fix stale `workTasks/` refs); align root `README.md`; refresh `docs/`. Derive from the 70 merged PRs, not memory. Docs-only, no `src/` changes. Lands before the human cuts `v2.0.0` via `gh release create v2.0.0` (RELEASING.md).
