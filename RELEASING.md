# Releasing insight-flow

Releases are automated with [release-please](https://github.com/googleapis/release-please)
(changelog + version bump + tag + GitHub release) and a separate publish workflow
that pushes to npm via **OIDC Trusted Publishing** (no `NPM_TOKEN`, provenance attached).

```
conventional commits on main
        │
        ▼
release-please.yml ──► opens/updates a "Release PR" (bumps version, edits
        │              packages/taskflow/CHANGELOG.md, no human writing needed)
        │
   you merge it
        │
        ▼
release-please tags vX.Y.Z + creates the GitHub Release
        │
        ▼
release-publish.yml (on: release published) ──► build ──► npm publish
                                                 (OIDC + provenance)
```

## One-time setup (human — do this once before the first automated publish)

1. **Register the GitHub Actions trusted publisher on npm.**
   npmjs.com → the `insight-flow` package → **Settings → Trusted Publishing** →
   *Add publisher*:
   - Repository: `Slavo775/insight-flow`
   - Workflow filename: `release-publish.yml`
   - Environment: `npm-publish`

2. **(Recommended) Add a manual approval gate.**
   GitHub → repo **Settings → Environments → `npm-publish`** → add yourself as a
   *required reviewer*. The publish job then waits for your click.

3. **Enable the free public-repo protections.**
   GitHub → **Settings → Code security** → enable *Secret scanning*,
   *Push protection*, and *Dependabot alerts*.

No `NPM_TOKEN` secret is needed — OIDC handles auth.

## Normal release (after setup)

1. Land normal conventional commits on `main` (`feat:`, `fix:`, etc.).
2. release-please keeps a **Release PR** open. When you're ready, **merge it**.
3. That tags the release and publishes the GitHub Release, which triggers
   `release-publish.yml`. Approve the `npm-publish` environment if prompted.
4. Confirm: `npm view insight-flow version` shows the new version with a
   provenance badge on npmjs.com.

## Cutting the first major — v2.0.0

The jump to `2.0.0` is a deliberate major (breaking: agent composition model v2,
"everything is a module" — see the `[2.0.0]` entry in
[`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md)).

This first entry is **hand-written** on purpose: letting release-please generate
it would back-fill the ~90 commits between `v1.0.0` and now, which we don't want.
Because the `[2.0.0]` changelog section, `package.json` version, and
`.release-please-manifest.json` are already set to `2.0.0`, you cut this one
release **directly** (don't use `Release-As` here — that would make release-please
prepend a second, duplicate `[2.0.0]` section):

```bash
# After the pipeline PR is merged to main:
gh release create v2.0.0 \
  --target main \
  --title "v2.0.0" \
  --notes "See packages/taskflow/CHANGELOG.md [2.0.0]"
```

Publishing that release triggers `release-publish.yml` → npm publish (OIDC +
provenance). From the next change onward, release-please takes over fully: it sees
the `v2.0.0` tag as the baseline and opens normal Release PRs for `2.0.1` / `2.1.0`
/ etc.

> If `release-please.yml` opens a Release PR in the brief window between merging
> the pipeline and creating the `v2.0.0` release, just ignore/close it, create the
> `v2.0.0` release, and let the next one regenerate.
>
> For any **future** forced version jump (where release-please *is* writing the
> changelog), the `Release-As: X.Y.Z` commit footer is the right tool:
> `git commit --allow-empty -m "chore: release X.Y.Z" -m "Release-As: X.Y.Z"`.

> Note: `release-please-config.json` sets `last-release-sha` to the commit where
> this pipeline landed, so generated changelogs never back-fill pre-2.0.0 commits.

## Security notes (public repo)

- `release-publish.yml` triggers **only** on `release: published` — never on
  `pull_request` — so secrets / OIDC are never exposed to fork PRs.
- Workflows default to `permissions: contents: read`; jobs elevate only what they
  need (`id-token: write` for OIDC, `contents: write` + `pull-requests: write`
  for release-please).
- All third-party actions are pinned to a commit SHA.
