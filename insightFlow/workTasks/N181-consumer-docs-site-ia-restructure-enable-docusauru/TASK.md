# N181 — Consumer docs-site IA restructure + enable Docusaurus versioning

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

- The Docusaurus site (N178) is **reference-heavy and lopsided**: CLI / Agents / Flow / Configuration reference is strong, but the consumer journey (learn → do → understand) is thin. Measured against Diátaxis: Reference 🟢, Tutorial 🟡 (one quickstart), How-to 🔴 (none), Explanation 🔴 (overview only). The nav has no consumer-oriented grouping — `overview`, `getting-started`, `configuration` sit as loose top-level pages alongside category folders.
- There is **no versioning**. The project is at 2.0.1 with a real v1→2.0 break; as future breaking releases ship, unversioned docs will misrepresent older installs.

This task lays the **foundation only**: the information architecture + versioning. Actual tutorial / how-to / concept prose and dashboard screenshots are follow-on tasks (Task C+).

## Goal

1. A single **consumer-oriented IA**: Get Started · Guides · Concepts · Reference (no contributor/internals track).
2. New **Guides** and **Concepts** sections exist with real intro/landing pages + stubs (nav is never empty).
3. **Docusaurus versioning enabled**: current docs snapshotted as `2.0`, version dropdown in the navbar, `docs/` remains the working ("next") version.
4. Build stays green (no broken links/anchors) and the **GitHub Pages deploy** (`.github/workflows/docs.yml`) still passes.
5. **Low-churn**: `sync-docs.mjs` and the synced `reference/` folder are NOT relocated.

## Scope

### In scope

- **Get Started group** — create `website/docs/get-started/` and move `overview.md` + `getting-started.md` into it with a `_category_.json` (position 1). Add a `_category_.json` link/index. Add a stub page for the future "Your first task" tutorial (intro + "coming soon"/outline is fine — no full prose).
- **Guides section** — create `website/docs/guides/` with `_category_.json` + an `index.md` landing page that lists the planned recipes (wire PRs, add quality gates, custom flows, multi-project master, v1→2.0 migration) as stubs/outline.
- **Concepts section** — create `website/docs/concepts/` with `_category_.json` + an `index.md` "How it works" landing (light, user-facing: mental model — task ⇄ flow ⇄ agents; why agent-driven; why technology-agnostic). Stubs/outline acceptable; full prose is a later task.
- **Reference grouping** — keep `cli/`, `agents/`, `flow/`, `configuration.md`, and the synced `reference/` where they are. Adjust `_category_.json` `position` values (and `configuration.md` / moved pages' `sidebar_position`) so the sidebar reads: Get Started → Guides → Concepts → CLI → Configuration → Agents → Flow → Reference. `configuration.md` may move under a reference grouping or stay top-level — pick the lowest-churn option that orders correctly.
- **Versioning** — run `pnpm --dir website run docusaurus docs:version 2.0` (Docusaurus 3.10). Configure the `docs` preset and add a `docsVersionDropdown` navbar item in `website/docusaurus.config.*`. Ensure `versioned_docs/`, `versioned_sidebars/`, `versions.json` are committed and the deploy builds them.
- **Cross-links** — fix every relative link broken by moving `overview.md` / `getting-started.md` (and any page that linked to them, e.g. `configuration.md`'s "See also", `cli/index.md`, `overview.md`'s "where to next").

### Out of scope

- Writing the actual tutorial / how-to / concept **prose** (only intros + stubs here) — Task C+.
- Dashboard **screenshots / visuals** — separate task.
- **CLI reference auto-generation** (drift tooling) — separate task.
- Any change to `packages/taskflow/scripts/sync-docs.mjs` or relocating the synced `reference/` folder.
- Contributor/internals docs (dropped — consumer-only program).
- The npm README (that is N180).

## Implementation plan

1. **Snapshot then restructure (order matters).** Decide whether to run `docs:version 2.0` before or after the IA move; recommended: do the **IA restructure first**, verify build, **then** snapshot — so the `2.0` snapshot captures the new IA, not the old one. Document the choice.
2. **Create Get Started group.** `mkdir get-started/`, move `overview.md` + `getting-started.md` in, add `_category_.json` (label "Get Started", position 1), add tutorial stub `get-started/first-task.md`.
3. **Create Guides + Concepts** with `_category_.json` + `index.md` landings (position 2, 3) and stub child pages with intros + outlines.
4. **Reorder reference categories.** Update `cli/`, `agents/`, `flow/` `_category_.json` positions and `configuration.md` placement so the full sidebar reads as the consumer journey.
5. **Fix cross-links** broken by the moves (grep for `overview.md` / `getting-started.md` / `(./overview` / `(../overview` etc. across `website/docs/`).
6. **Enable versioning.** `docusaurus docs:version 2.0`; add `docsVersionDropdown` to navbar; confirm `versions.json` + `versioned_docs/version-2.0/` + `versioned_sidebars/` generated and committed.
7. **Build + deploy check.** `pnpm --dir website build` clean (no broken links/anchors); review `.github/workflows/docs.yml` to confirm it builds the versioned output (no path assumptions broken). Run `sync-docs.mjs` (via `pnpm sync`) — confirm still 0-drift and `reference/` untouched.

## Verification

- `pnpm --dir website build` passes with **zero** broken-link/anchor warnings (Docusaurus throws on broken links).
- `pnpm sync` reports `reference/` unchanged (sync-docs not touched).
- Sidebar renders the consumer journey order: Get Started → Guides → Concepts → CLI → Configuration → Agents → Flow → Reference.
- Navbar shows a version dropdown; `versions.json` lists `2.0`; `/insight-flow/docs/2.0/...` resolves in the build output and `/docs/...` is the "next" working version.
- `.github/workflows/docs.yml` build step succeeds against the versioned site (verify locally that the same `build` command it runs is green).

## Notes

- Foundation task in the documentation program: N178 (scaffold) → N179 (config reference) → **N180 (README funnel)** → **N181 (this: IA + versioning)** → Task C+ (tutorial/how-to/concept prose, screenshots, CLI auto-gen).
- Decisions locked during analysis: consumer-only audience; light user-facing Concepts kept; synced role/protocol files stay in Reference (no `sync-docs.mjs` change); versioning enabled now.
- Docusaurus 3.10.1; site is `url: https://slavo775.github.io`, `baseUrl: /insight-flow/`. Sidebar is a single autogenerated tree (`website/sidebars.ts`) driven by folder structure + `_category_.json` + `sidebar_position`.
- ⚠️ Versioning **doubles** the docs Docusaurus must build (current + version-2.0); watch build time and the Pages deploy.
- See `ANALYSIS.md` for the Diátaxis gap assessment and the audience/versioning decisions.
