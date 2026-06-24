# insight-flow docs site

[Docusaurus](https://docusaurus.io/) documentation site for **insight-flow**.
This is a **private** workspace package — it is never published to npm.

## Develop

```bash
pnpm --dir website start     # sync reference docs, then dev server
pnpm --dir website build     # sync reference docs, then production build
pnpm --dir website serve     # serve the production build locally
```

## Source-of-truth model (curate + link)

- **Authored prose** lives natively in `docs/` (`getting-started.md`,
  `concepts.md`, `cli-reference.md`).
- **Reference pages** under `docs/reference/` are **generated** from the
  canonical role/protocol files at the repo root by
  `packages/taskflow/scripts/sync-docs.mjs`. That directory is **gitignored** —
  do not edit it, and do not hand-copy root content. The `start`/`build` scripts
  run the sync first; run it directly with `pnpm --dir website sync`.

## Versioning (not enabled yet)

Docs versioning is intentionally **off** in this scaffold. When a v2 snapshot is
wanted, it is a single command:

```bash
pnpm --dir website exec docusaurus docs:version 2.0
```

## Deployment

CI deploys to GitHub Pages on push to `main` touching `website/**` (see
`.github/workflows/docs.yml`). Production URL:
`https://slavo775.github.io/insight-flow/`.
