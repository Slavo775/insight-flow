# N193 — Analysis (pre-taskmaster strategist trail)

## Problem framing

After merging the release-please PR, the GitHub Release (v2.1.0) was created but
the npm publish never ran and no approval prompt appeared. Investigation showed:
the release-publish run was never *created* (not pending) — i.e. the triggering
event was suppressed, not gated.

## Root cause (evidenced)

- `gh release view v2.1.0` → author **`github-actions[bot]`** (release-please Action, default `GITHUB_TOKEN`).
- `gh release view v2.0.1` → author **`Slavo775`** (human) — and *its* `release-publish` run succeeded.
- No `release-publish` run for v2.1.0; `npm view insight-flow version` = `2.0.1`.

GitHub deliberately **does not start new workflow runs from events created by the
default `GITHUB_TOKEN`** (loop prevention; exceptions: `workflow_dispatch` /
`repository_dispatch`). `release-publish.yml` triggers only on `release:
published`, so a bot-created release never fires it. v2.0.x "worked" only because
a human published those releases. So "action didn't trigger" and "approval didn't
happen" are the same bug — no run was ever created.

## Goal

Merging the release PR auto-runs publish (with the approval gate + OIDC), without
depending on the suppressed event or introducing a secret.

## Options considered

- **A — chain publish off release-please's `release_created` output** (a `publish`
  job `needs` release-please, `if release_created`, `uses` release-publish as a
  reusable workflow). No event dependency, no secret; keeps OIDC + the
  `npm-publish` approval gate; trust boundary stays safe (runs on `push: main` /
  `workflow_call`, never `pull_request`). Keep `release: published` too for manual
  human releases (mutually exclusive — no double-publish).
- **B — PAT / GitHub App token for release-please** so its release is authored by
  a real identity and the event cascades. Minimal workflow change, but adds a
  secret to create/rotate (PAT expiry = future silent breakage).
- **C — trigger on tag push.** Rejected — tags pushed by `GITHUB_TOKEN` are
  suppressed too; only works with a PAT (collapses into B).

## Decision

**Option A, with `release-publish.yml` as a reusable workflow** (`workflow_call`),
called by a conditional `publish` job in `release-please.yml`. Chosen for: no
secret to rotate, deterministic (output-driven, not event-driven), preserves
OIDC/provenance + the approval gate, and the cleaner separation of keeping publish
logic in its own callable file. (User picked A + reusable over inline.)

## Open questions

- Whether `release-publish.yml` references any repo secret → if so, the caller
  passes `secrets: inherit`; if it's pure OIDC, none needed.
- Confirm `release-please-action` v4 output name (`release_created`) against the
  pinned SHA at implementation.

## Sources

- `.github/workflows/release-please.yml` (no `token:` → default `GITHUB_TOKEN`),
  `.github/workflows/release-publish.yml` (`on: release: published`, `environment:
  npm-publish`, OIDC), `release-please-config.json` / manifest.
- `gh release view` authors + `gh run list` (no v2.1.0 publish run) + `npm view`.
- GitHub Actions docs: default-`GITHUB_TOKEN` events don't create new runs.

## Handoff brief

In TASK.md/CHECKLIST.md: make `release-publish.yml` `workflow_call`-able (keep
`release: published`), expose release-please `release_created`/`tag_name` outputs,
add a conditional `publish` job that `uses` the reusable workflow with
`permissions` + `secrets: inherit`, fix the stale comments, verify no
double-publish. Out: PAT/App token (B), the one-off v2.1.0 manual publish.
