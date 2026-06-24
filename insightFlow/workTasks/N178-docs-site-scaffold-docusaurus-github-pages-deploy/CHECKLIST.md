# N178 — Docs site scaffold — Docusaurus + GitHub Pages deploy — Checklist

## Done criteria

- [ ] `website/` Docusaurus package exists, `"private": true`, added to `pnpm-workspace.yaml`.
- [ ] `docusaurus.config.ts` set for project Pages: `baseUrl: /insight-flow/`, `organizationName: Slavo775`, `projectName: insight-flow`.
- [ ] `pnpm --dir website build` succeeds and produces `website/build/`.
- [ ] `packages/taskflow/scripts/sync-docs.mjs` exists, mirrors `sync-role-templates.mjs`, and populates `website/docs/reference/` idempotently with a "generated, do not edit" banner.
- [ ] `website/docs/reference/` is gitignored; sync runs as a prebuild step.
- [ ] 3 authored pages present: Getting Started, Concepts, CLI reference stub; `sidebars.ts` wires all 4 sections.
- [ ] `.github/workflows/docs.yml` deploys to GitHub Pages, path-filtered to `website/**`, with least-privilege `permissions`.
- [ ] `pnpm pack:taskflow` tarball contains **no** `website/` files (verified via `tar -tzf`).
- [ ] Docusaurus versioning NOT enabled (no `website/versioned_docs/`); layout ready for `docusaurus docs:version 2.0`.

## Quality gates

- [ ] `pnpm --dir website build` passes (Docusaurus broken-link check clean)
- [ ] `node packages/taskflow/scripts/sync-docs.mjs` runs clean and is idempotent
- [ ] Existing `pnpm build` / `pnpm pack:taskflow` unaffected (no regression)
- [ ] `.github/workflows/docs.yml` is valid YAML and triggers only on `website/**`

## Verification

- [ ] `pnpm --dir website serve` renders Getting Started, Concepts, CLI stub, and synced Reference under `/insight-flow/`.
- [ ] `tar -tzf` of the packed `insight-flow` tarball shows zero `website/` entries.
