# N193 — Auto-publish on release — chain release-publish off release-please output (reusable workflow) — Checklist

## Done criteria

- [ ] `release-publish.yml` accepts `on: workflow_call` AND keeps `on: release: published`
- [ ] Publish job retains `environment: npm-publish` (approval gate) + `permissions: id-token: write` (OIDC/provenance)
- [ ] `release-please.yml` step has `id: release`; job exposes `release_created` (+ `tag_name`) outputs
- [ ] `publish` job added: `needs: release-please`, `if: …release_created == 'true'`, `uses: ./.github/workflows/release-publish.yml` with `permissions` + `secrets: inherit`
- [ ] Stale comments in both workflows corrected (chained-output model + mutual-exclusion note)
- [ ] No double-publish: bot release → workflow_call path only; human release → `release: published` path only

## Quality gates

- [ ] Workflow YAML validates (actionlint if available; else reviewed `workflow_call` inputs/secrets + `uses` path + permissions)
- [ ] No change to release-please versioning/CHANGELOG config
- [ ] No secret/PAT introduced (Option A constraint)

## Verification

- [ ] Next release-please PR merge → a `release-publish` run is created (chained), pauses at `npm-publish` approval, and publishes on approval (npm version advances with provenance)
- [ ] A manual human GitHub Release still publishes via `release: published` and does not double-publish
