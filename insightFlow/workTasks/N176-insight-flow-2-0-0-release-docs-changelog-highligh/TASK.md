# N176 — insight-flow 2.0.0 release docs — CHANGELOG highlights + README + docs refresh

**Type:** docs
**Priority:** high
**Created:** 2026-06-24

## Problem

- **70 PRs (N81–N174) merged since `v1.0.0`**, but the `[2.0.0]` CHANGELOG entry documents only **2** of them (N81 + N89). A major release that under-documents its scope — especially its breaking changes — is the worst failure mode before publish.
- `packages/taskflow/README.md` (945 lines) still headers **"What's new in 1.0.0"** (line 7) and predates the entire flows / install / composition-v2 era; it also carries stale `workTasks/` layout references.
- The root `README.md` (263 lines, also user-facing) and `docs/architecture-diagrams.md` predate the React/Vite dashboard rewrite, composition v2, and the flow system.
- This is the last docs gate before cutting `v2.0.0` (N175 built the publish pipeline).

## Goal

1. A curated, themed `[2.0.0]` CHANGELOG entry with a **complete** Breaking Changes / Migration section.
2. Package README updated to 2.0.0 (what's-new + new feature sections + no stale layout refs).
3. Root README aligned with 2.0.0 and consistent with the package README.
4. `docs/` refreshed to match the current architecture.
5. All claims derived from `git log v1.0.0..main` + spot-checked task specs — not memory.

## Scope

### In scope

- **`packages/taskflow/CHANGELOG.md`** (canonical) — replace the thin `[2.0.0]` with ~8–12 grouped **Added / Changed / Fixed** themed bullets (see Implementation plan for themes); **complete** the `⚠ BREAKING CHANGES` / Migration section.
- **`packages/taskflow/README.md`** — `## What's new in 1.0.0` (line 7) → 2.0.0 highlights; fix stale `workTasks/` → `insightFlow/workTasks/` references; add concise sections for flows + flow editor, install/uninstall, flow-driven statuses, agent composition v2.
- **`README.md`** (root) — align "What You Get" / feature list + quick start with 2.0.0; keep consistent with the package README.
- **`docs/architecture-diagrams.md`** — refresh for React/Vite dashboard, composition v2, flows.
- **`docs/local-testing-with-yalc.md`** — sanity-check, fix only if stale.

### Out of scope

- **Source code** — docs only; no behavior changes.
- **Role `*.md` / `AGENT_*.md`** (9 files) — behavior docs synced from `packages/taskflow/templates/roles/`; already current.
- **The npm publish itself** — covered by `RELEASING.md` human steps; this task only prepares docs.
- **Per-task changelog backfill** — explicitly rejected; curate, don't list all 70/94.
- **The release date** — left as a placeholder/today; stamped for real at publish time.

## Implementation plan

1. **Derive the change inventory** — `git log v1.0.0..main --pretty=format:'%s' | grep -E '\(#[0-9]+\)'` for the 70 PR subjects (already `feat/fix` + scope `flows|install|dashboard|cli`). Group by theme. Spot-check headline task specs (N85 React rewrite, N89 composition v2, N99–N101 layout, N116/N128 flow-statuses, N125–N127/N174 install) for accurate wording.
2. **Verify the breaking surface** — confirm and document as breaking: composition v2 (N89, already present); **`insightFlow/` layout migration** (N99–N101, `insight-flow migrate-layout`) — what changed for existing projects and the migration command; **check whether `batch*→bulk*` aliases were removed** this cycle (`git log v1.0.0..main` + grep src for `batch`) and document if removed. Each breaking item gets a one-line Migration.
3. **Rewrite `[2.0.0]` CHANGELOG** — keep `## [2.0.0]`; structure: `### ⚠ BREAKING CHANGES` (complete) → `### Added` → `### Changed` → `### Fixed`, ~8–12 curated themed bullets total in the latter three. Preserve all history below. Themes: package consolidation; React/Vite dashboard rewrite; agent composition v2; insightFlow/ layout migration; flow map + flow editor; flow-driven statuses & kanban; install/uninstall engine; user-space custom registries + CRUD; observability (Langfuse/OTel, opt-in); fixes roundup.
4. **Package README** (`packages/taskflow/README.md`) — line 7 header → "What's new in 2.0.0" with the highlights; grep + fix stale `workTasks/` references; add/extend sections: Flows & flow editor, Install/uninstall, Flow-driven statuses, Agent composition v2. Keep additions concise (link to CHANGELOG for the full list).
5. **Root README** (`README.md`) — update "What You Get" + Quick Start + Dashboard/CLI sections to reflect flows, install, and the `insightFlow/` layout; ensure feature claims match the package README.
6. **docs/** — update `architecture-diagrams.md` (server-rendered → React/Vite client, composition v2 registry, flow model); verify `local-testing-with-yalc.md` against current `pnpm yalc:*` scripts.
7. **Self-check** — `grep -rn "workTasks/" README.md packages/taskflow/README.md docs` returns no stale (non-`insightFlow/`) layout refs; `grep -rn "1.0.0" packages/taskflow/README.md` has no stale "what's new" header; markdown renders (no broken relative links).

## Verification

- `git log v1.0.0..main` themes are all represented in the `[2.0.0]` CHANGELOG; no per-task wall (≤ ~12 highlight bullets).
- Breaking section lists composition v2 **and** the layout migration (and alias removal if applicable), each with a Migration line.
- `grep -n "What's new in 2.0.0" packages/taskflow/README.md` matches; `grep -rn "workTasks/" README.md packages/taskflow/README.md docs/` shows only `insightFlow/workTasks/` (no bare legacy refs in current-state prose).
- Root README "What You Get" mentions flows + install; consistent with package README.
- `docs/architecture-diagrams.md` describes the React/Vite dashboard + flows (no "server-rendered only" claim left if inaccurate).
- No changes under `src/` (docs-only): `git diff --name-only` shows only `*.md` + CHANGELOG.

## Notes

- **From `/task-analyze` (ANALYSIS.md):** curated themed highlights chosen over full per-PR list or minimal; scope = CHANGELOG + both READMEs + docs/; single task. Source of truth = the 70 merged PRs, not memory.
- Related: **N175** (publish pipeline — this is the docs gate before its first use); **N80** (1.0.0 release-docs pattern this mirrors at major scale); **N89 / N99–N101** (the breaking changes to document).
- After this lands, the human cuts `v2.0.0` via `gh release create v2.0.0` (see `RELEASING.md`).
