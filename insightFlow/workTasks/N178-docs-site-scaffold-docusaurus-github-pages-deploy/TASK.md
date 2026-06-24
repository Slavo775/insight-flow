# N178 — Docs site scaffold — Docusaurus + GitHub Pages deploy

**Type:** feat
**Priority:** medium
**Created:** 2026-06-24

## Problem

- insight-flow shipped 2.0.1 with a large, fast-growing feature surface (flow system, install/uninstall engine, agent composition v2, React/Vite dashboard) but has **no documentation site** — content lives in ~1,750 lines of scattered root markdown (`README.md`, 9 `TASK_*_ROLE.md`, `AGENT_*`, `PR_API.md`, `RELEASING.md`).
- Drift has already begun (`CLAUDE.md` says "server-rendered, no React"; `README.md` says "React/Vite dashboard"). New users have no curated front door, and there is no published static site like comparable packages have.

## Goal

1. A working Docusaurus site under `website/` that builds locally (`npm run build` in `website/`).
2. The site auto-deploys to GitHub Pages via CI on push to `main` touching `website/**`.
3. A curate-and-link source-of-truth model: authored prose is native; canonical role/protocol files are pulled in by a sync script, never hand-copied.
4. The `website/` package is private and provably excluded from the published `insight-flow` npm tarball.
5. A nav skeleton + 3 authored skeleton pages, structured so doc versioning is a clean one-command follow-up.

## Scope

### In scope

- New `website/` Docusaurus workspace package (private, not published). Classic preset, TypeScript config (`docusaurus.config.ts`).
- `docusaurus.config.ts`: `url: https://slavo775.github.io`, `baseUrl: /insight-flow/`, `organizationName: Slavo775`, `projectName: insight-flow`, `trailingSlash` set appropriately for Pages.
- `.github/workflows/docs.yml` — first workflow in the repo. Builds `website/` and deploys to GitHub Pages (`actions/configure-pages`, `upload-pages-artifact`, `deploy-pages`); triggers on push to `main` with path filter `website/**` (+ `workflow_dispatch`).
- `packages/taskflow/scripts/sync-docs.mjs` (sibling to `sync-role-templates.mjs`) — copies canonical role/protocol files (the `TASK_*_ROLE.md`, `AGENT_*.md`, `PR_API.md`) into `website/docs/reference/` with a "generated, do not edit" banner; wired as a `predocs`/prebuild step. `website/docs/reference/` is gitignored (generated).
- 3 authored pages in `website/docs/`:
  - **Getting Started** — `npx insight-flow init` → `create` → launch dashboard.
  - **Concepts** — tasks / flows / agents / modules + the `ready → … → merged` lifecycle.
  - **CLI reference (stub)** — command list placeholder, marked WIP.
- `sidebars.ts` nav skeleton: Getting Started · Concepts · CLI Reference · Reference (synced).
- Root wiring: add `website` to the pnpm workspace; ensure `pnpm pack:taskflow` output is unaffected.

### Out of scope

- Content fill beyond the 3 skeleton pages (Getting Started / Concepts / CLI stub) — iterative follow-ups.
- Enabling Docusaurus **versioning** (`docusaurus docs:version 2.0`) — structure for it, but do NOT snapshot a version here.
- Auto-generating the CLI reference from command definitions — future task; stub only.
- Inverting the role-file sync pipeline (consolidate-into-docs model B was rejected).
- Touching `packages/taskflow/src/**` runtime code.

## Implementation plan

1. **Scaffold the site** — create `website/` via Docusaurus classic + TS preset; set `package.json` `"private": true`, name e.g. `@insight-flow/website`. Add `website` to `pnpm-workspace.yaml`.
2. **Configure for project Pages** — `docusaurus.config.ts` with `url`/`baseUrl: /insight-flow/`/`organizationName`/`projectName`; point editUrl + repo links at `github.com/Slavo775/insight-flow`.
3. **Sync script** — write `packages/taskflow/scripts/sync-docs.mjs` mirroring `sync-role-templates.mjs`: read canonical root files, write into `website/docs/reference/*.md` with frontmatter + "AUTO-GENERATED — edit the source file at repo root" banner. Add `website/docs/reference/` to `.gitignore`. Hook as a prebuild/`predocs` script so `build` always re-syncs.
4. **Author skeleton pages** — Getting Started, Concepts, CLI reference stub in `website/docs/`; wire `sidebars.ts` with the 4 sections.
5. **CI deploy** — `.github/workflows/docs.yml`: checkout → pnpm/node setup → run sync + `pnpm --dir website build` → `upload-pages-artifact` → `deploy-pages`; `on: push: branches: [main], paths: ['website/**']` + `workflow_dispatch`; least-privilege `permissions: { pages: write, id-token: write, contents: read }`.
6. **Prove tarball isolation** — run `pnpm pack:taskflow`, inspect tarball contents (`tar -tzf`), confirm no `website/` files are included.
7. **Versioning readiness** — confirm `docs/` layout + config are compatible with a later `docusaurus docs:version 2.0` (no snapshot created now; note the one command in README of `website/`).

## Verification

- `pnpm --dir website build` succeeds and emits `website/build/`.
- `node packages/taskflow/scripts/sync-docs.mjs` populates `website/docs/reference/` from canonical root files; re-running is idempotent.
- `pnpm pack:taskflow` → `tar -tzf` shows **no** `website/` entries.
- `.github/workflows/docs.yml` validates (Actions tab / `act` or YAML lint) and is path-filtered to `website/**`.
- Local serve (`pnpm --dir website serve` or `start`) renders all 3 authored pages + the synced Reference section under `/insight-flow/`.

## Notes

- Produced by `/task-analyze`; see `ANALYSIS.md` in this folder for options considered, the rejected consolidate-into-docs model, and the SSG decision (Docusaurus chosen for first-class versioning given the recent v1→v2 migration, N177).
- Decisions locked with the human: **Docusaurus** (vs VitePress/Starlight) · **curate + link** source-of-truth · **scaffold + skeleton** scope · **CI from day one** (defaulted — repo had zero workflows; confirm acceptable).
- Sync pattern intentionally mirrors the existing `packages/taskflow/scripts/sync-role-templates.mjs` so there's one idiom for "canonical root file → generated copy."
- Related: N177 (v1→v2 migration docs in README) is the content this site will eventually absorb/link.
