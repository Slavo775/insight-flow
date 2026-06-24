# ANALYSIS — N178 Docs site scaffold (Docusaurus + GitHub Pages)

_Produced by `/task-analyze` (Pre-Taskmaster Strategist) before handoff to `/taskmaster`._

## Problem framing

insight-flow reached 2.0.1 with a large, fast-moving feature surface (flow system, install/uninstall engine, agent composition v2, React/Vite dashboard) but **no documentation site**. Content lives in ~1,750 lines of scattered root markdown. Drift has already started: `CLAUDE.md` describes a "server-rendered, no React" dashboard while `README.md` describes a "React/Vite dashboard." There is no curated front door for new users and nothing comparable to the static docs sites peer packages publish.

The real risk is **not** picking a static-site generator — it's **duplication/drift**. The `TASK_*_ROLE.md` files are already canonical and script-synced (`sync-role-templates.mjs`); a docs site that re-authors that content would rot, exactly as `CLAUDE.md` already has.

## Goal

Stand up a documentation site as a curated front door that builds and deploys to GitHub Pages, without forking the existing canonical content into a second source of truth — a skeleton to prove the pipeline, filled iteratively later.

## Options considered

### SSG framework
- **VitePress** — lean, Vue/Vite (matches the dashboard's Vite stack), TS-native, built-in search. Lowest maintenance.
- **Starlight (Astro)** — most polished out-of-the-box (nav/search/theming).
- **Docusaurus (React) ✅ chosen** — heaviest, but best-in-class **doc versioning** (v1 + v2 side by side), which is directly relevant given the just-completed v1→v2 migration (N177).

### Source-of-truth model
- **Curate + link ✅ chosen** — authored prose native in `website/docs/`; canonical role/protocol files pulled in by a sync script. Lowest drift risk; reuses the existing sync idiom.
- **Consolidate into docs (rejected)** — docs become canonical, role files generated from docs. Inverts a working pipeline that drives live slash commands; larger and riskier.
- **Copy for now, reconcile later (rejected)** — fastest to visible output but reintroduces the exact drift problem we're trying to kill.

### Scope
- **Scaffold + skeleton ✅ chosen** — stand up site + CI + nav + 3 real pages; fill iteratively.
- Full feature coverage in one pass (rejected — too large for a first cut).
- Auto-generated CLI reference first (deferred — good follow-up, stub for now).

## Decision

Docusaurus site under `website/` (private workspace package, excluded from the npm tarball), curate-and-link sourcing via a new `sync-docs.mjs` mirroring `sync-role-templates.mjs`, deployed to GitHub Pages by a new `.github/workflows/docs.yml`. Versioning structured-for but **off**. CI included from day one (defaulted, see below).

## Open questions

1. **CI-from-day-one** — defaulted to YES (repo had zero workflows; a docs site nobody can see has little value). Flagged for confirmation; easy to split Pages wiring into a fast-follow if preferred.
2. **Package name** — `@insight-flow/website` assumed; bikeshed-level, change freely.
3. **Pages availability** — assumes GitHub Pages is enabled for `Slavo775/insight-flow` with "GitHub Actions" as the source; implementer should confirm in repo settings.

## Sources

- Repo survey: no `docs/`, no `.github/workflows`, no SSG deps; ~1,750 lines of root markdown; 9 `TASK_*_ROLE.md`.
- `packages/taskflow/package.json` — `insight-flow@2.0.1`, homepage `github.com/Slavo775/insight-flow#readme`.
- `README.md` vs `CLAUDE.md` — observed dashboard-description drift.
- Existing pattern: `packages/taskflow/scripts/sync-role-templates.mjs`.
- Related task: N177 (v1→v2 migration docs in README).

## Handoff brief

> **Title:** Docs site scaffold — Docusaurus + GitHub Pages deploy · **Type:** feat · **Priority:** medium · **Tags:** docs, docusaurus, ci
>
> Stand up a private Docusaurus site under `website/` (excluded from the npm tarball — verify pack output). Deliver a working skeleton: builds + deploys to GitHub Pages via `.github/workflows/docs.yml` (baseUrl `/insight-flow/`, push-to-main path-filtered to `website/**`), nav skeleton, and 3 authored pages (Getting Started; Concepts: tasks/flows/agents/modules + lifecycle; CLI reference stub). Curate-and-link sourcing via a new `sync-docs.mjs` that mirrors `sync-role-templates.mjs`. Versioning off but structured for a one-command `docusaurus docs:version 2.0` follow-up. Content fill beyond the 3 pages is out of scope.
