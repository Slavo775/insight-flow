# N181 — Consumer docs-site IA restructure + enable Docusaurus versioning — Checklist

## Done criteria

- [ ] `get-started/` group exists with `overview.md` + `getting-started.md` moved in, a `_category_.json` (position 1), and a "Your first task" tutorial stub.
- [ ] `guides/` section exists with `_category_.json` + `index.md` landing listing planned recipes (stubs/outline).
- [ ] `concepts/` section exists with `_category_.json` + `index.md` "How it works" landing (mental model / why agent-driven / why tech-agnostic — stub/outline ok).
- [ ] Reference areas (`cli/`, `agents/`, `flow/`, `configuration.md`, synced `reference/`) left in place; only positions adjusted.
- [ ] Sidebar order reads: Get Started → Guides → Concepts → CLI → Configuration → Agents → Flow → Reference.
- [ ] Docusaurus versioning enabled: `versions.json` lists `2.0`; `versioned_docs/version-2.0/` + `versioned_sidebars/` generated and committed.
- [ ] Navbar has a `docsVersionDropdown`.
- [ ] All cross-links broken by moving `overview.md`/`getting-started.md` are fixed.
- [ ] `sync-docs.mjs` NOT modified; synced `reference/` folder NOT relocated.
- [ ] No tutorial/how-to/concept full prose, no screenshots, no CLI auto-gen (out of scope).

## Quality gates

- [ ] `pnpm --dir website build` passes with zero broken-link/anchor warnings.
- [ ] `pnpm sync` (sync-docs) reports `reference/` unchanged (0 written / 0 pruned).
- [ ] `npx prettier --check` passes on new/changed docs files.

## Verification

- [ ] Build output contains both `/docs/...` (next) and `/docs/2.0/...` (versioned) routes.
- [ ] `.github/workflows/docs.yml`'s build command runs green locally against the versioned site.
- [ ] Click through the rendered sidebar: consumer journey order is correct and Guides/Concepts landings are non-empty.
