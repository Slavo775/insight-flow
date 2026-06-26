# N193 — Auto-publish on release — chain release-publish off release-please output (reusable workflow)

**Type:** fix
**Priority:** high
**Created:** 2026-06-26

## Problem

When the release-please PR is merged, the release-please **Action** creates the GitHub Release as `github-actions[bot]` using the default `GITHUB_TOKEN`. GitHub deliberately **does not trigger new workflow runs from `GITHUB_TOKEN`-created events** — so `release-publish.yml` (`on: release: published`) never starts, npm is never auto-published, and the `npm-publish` approval gate never even appears (no run is created). Confirmed on **v2.1.0**: tag + GitHub Release exist (author `github-actions[bot]`), but no `release-publish` run, and npm `latest` stayed `2.0.1`. v2.0.0/v2.0.1 only published because a **human** (`Slavo775`) created those releases (a real token whose events cascade).

## Goal

1. Merging the release-please PR auto-runs the publish pipeline **without** relying on the suppressed `release: published` event or a PAT/secret.
2. Preserve the `npm-publish` **approval gate**, **OIDC** trusted publishing, and provenance.
3. Keep manual/human releases publishing too (don't regress the path that works today).

## Scope

### In scope

- **`.github/workflows/release-publish.yml` → reusable.** Add `on: workflow_call` **alongside** the existing `on: release: published`. Keep `environment: npm-publish` (approval gate) and `permissions: id-token: write` (OIDC + provenance) on the publish job. Declare any `inputs`/`secrets` the `workflow_call` needs (likely none beyond `secrets: inherit`).
- **`.github/workflows/release-please.yml` → chain the publish.** Give the `release-please-action` step an `id` (e.g. `id: release`); expose `release_created` (and `tag_name`) as job outputs. Add a `publish` job: `needs: release-please`, `if: needs.release-please.outputs.release_created == 'true'`, `uses: ./.github/workflows/release-publish.yml` with the required `permissions` (`id-token: write`, `contents: read`) and `secrets: inherit`.
- **No double-publish.** Verify the two paths are mutually exclusive: a bot (release-please) release → only the `workflow_call` path runs (the `release: published` event is suppressed for the bot); a human manual release → only the `release: published` path runs (release-please's job didn't create it, so `release_created` is false on that push). Document this in the workflow comments.

### Out of scope

- Switching release-please to a PAT / GitHub App token (Option B — rejected).
- The one-off manual publish of the current **v2.1.0** (handled separately by re-firing the release event).
- Any change to versioning/CHANGELOG behaviour (release-please config is unchanged).

## Implementation plan

1. **Make `release-publish.yml` callable** — add `workflow_call` to `on:`; keep `release: published`. Confirm the job keeps `environment: npm-publish` + `id-token: write`. Add `secrets: inherit` support if any secret is referenced.
2. **Expose release-please outputs** — add `id: release` to the action step; set the job's `outputs:` to `release_created: ${{ steps.release.outputs.release_created }}` (+ `tag_name`).
3. **Add the `publish` job** in `release-please.yml` — `needs` + `if release_created == 'true'` + `uses` the reusable workflow with `permissions` + `secrets: inherit`.
4. **Update the stale comments** in both files (the current "…in turn triggers release-publish.yml" comment is the wrong assumption — replace with the chained-output explanation + the mutual-exclusion note).
5. **Validate** the YAML (actionlint if available; otherwise careful review of `workflow_call` input/secret wiring and the `uses:` local-path + permissions).

## Verification

- On the **next** release-please PR merge: a `release-publish` run is **created** (via the chained job), pauses at the `npm-publish` approval gate, and on approval publishes to npm with provenance (`npm view insight-flow version` advances).
- A **manual** human GitHub Release still triggers `release-publish` via `release: published` (no regression) and does **not** double-publish.
- `gh run list --workflow=release-please.yml` shows the `publish` job only when `release_created` is true.

## Notes

- Root-cause evidence: `gh release view v2.1.0` author = `github-actions[bot]`; v2.0.1 author = `Slavo775`; no `release-publish` run for v2.1.0; npm `latest` = `2.0.1`.
- Trust boundary preserved: publish now runs on `push: main` (post-merge, maintainers only) / `workflow_call`, never on `pull_request` — OIDC is never exposed to fork code.
- Lineage: N175 (the release pipeline this fixes). Decision trail in this folder's `ANALYSIS.md`.
- GitHub docs basis: events from the default `GITHUB_TOKEN` don't create new workflow runs (except `workflow_dispatch`/`repository_dispatch`).
