# N250 — Fix OIDC auto-publish: release-please creates release with a bot token so release:published fires (drop workflow_call)

**Type:** fix
**Priority:** high
**Created:** 2026-07-17

## Problem

Every release this session (2.8.2 / 2.9.0 / 2.10.0) failed the automatic npm
publish with `ENEEDAUTH`, needing a manual `workflow_dispatch` + approval. Root
cause: release-please chained the publish via **`workflow_call`**, so the OIDC
token's top-level workflow was `release-please.yml` — which does **not** match
npm's Trusted Publishing config (tied to `release-publish.yml`). npm minted no
token → `npm publish` ran unauthenticated → `ENEEDAUTH`. The manual
`workflow_dispatch` on `release-publish.yml` works because there the OIDC
identity **is** `release-publish.yml`.

## Goal

1. The automatic publish after a release works via OIDC — no manual step.
2. Keep npm's Trusted Publishing config unchanged (still `release-publish.yml`).
3. Keep the manual `workflow_dispatch` fallback.

## Scope

### In scope

- `.github/workflows/release-please.yml` — create the release with a bot token
  (`RELEASE_PLEASE_TOKEN`) so `release: published` fires; remove the
  `workflow_call` `publish` job + its outputs.
- `.github/workflows/release-publish.yml` — remove the dead `workflow_call`
  entry point; keep `release: published` (now primary) + `workflow_dispatch`.

### Out of scope

- No change to the publish steps (npm@^11.5.1 pin, provenance, LICENSE check).
- No npm-side reconfiguration (the trusted publisher stays `release-publish.yml`).

## Implementation plan

1. **release-please.yml** — add `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}` to
   the release-please-action; delete the `publish` job + `outputs`.
2. **release-publish.yml** — drop the `workflow_call` trigger; refresh the header.
3. Update the N193/N201 comments to describe the bot-token event path (N250).

## External step (human — required before merge)

- Create a **fine-grained PAT** (or GitHub App token) scoped to this repo with
  **Contents: read/write** + **Pull requests: read/write**, and add it as the
  repo secret **`RELEASE_PLEASE_TOKEN`**. Without it, release-please falls back to
  `GITHUB_TOKEN`, the release event will not fire, and nothing publishes.

## Verification

- After the secret is added and this PR is merged: the next release-please
  release fires `release: published` → `release-publish.yml` runs → OIDC token
  minted → `npm view insight-flow version` shows the new version, no manual
  dispatch needed.

## Notes

- If the PAT expires or is missing, the symptom is: release cut on GitHub but no
  npm publish (and no `release-publish` run) — fall back to the manual
  `gh workflow run release-publish.yml --ref main` + approval.
- Future hardening: swap the PAT for a GitHub App token via
  `actions/create-github-app-token` (short-lived, repo-scoped).
