# N175 — Analysis

## Problem framing

The user framed this as "the last task before publishing v2.0.0 was the automation to publish with a tag," plus a security worry about the repo being public. Investigation showed the framing didn't match reality:

- No publish automation exists (`.github/workflows/` empty).
- Every release so far (N13 → N80 GA) was manual.
- Published is `insight-flow@1.0.0`; there is no v2.0.0 yet.
- Both changelogs are 0 bytes (the `[1.0.0]` entry was lost) — sources already drifted.
- Repo is genuinely PUBLIC (`Slavo775/insight-flow`).

So the real ask = build a release pipeline + auto changelog, designed safely for a public repo, then use it to cut v2.0.0.

## Goal

Automate the tedium (changelog, tag, publish) while preserving the human decision of *when* to release; make it safe on a public repo; cut v2.0.0 through the new pipeline as its first exercise.

## Options considered

- **Changelog/release tooling:** release-please (Release PR, human-gated) vs semantic-release (fully automatic on merge) vs changesets (monorepo-oriented) vs git-cliff/GH auto-notes (lightweight).
- **npm auth:** OIDC Trusted Publishing (no stored token, provenance) vs scoped automation token in a secret.
- **Sequencing:** build pipeline first then cut 2.0.0 with it vs publish 2.0.0 manually now and automate later.
- **Changelog history:** reconstruct N81–N174 vs start fresh at 2.0.0.

## Decision

- **release-please (Path A)** — matches the user's established deliberate-milestone pattern (N80: "intentional 1.0.0, not semver-forced"); human gate kept (merge the Release PR). Rejected semantic-release (would risk surprise majors) and changesets (monorepo strength wasted on a single publishable package).
- **OIDC Trusted Publishing** — no leakable secret on a public repo; free provenance. Rejected stored token.
- **Pipeline first, then cut 2.0.0 through it.**
- **Changelog starts fresh at `[2.0.0]`** (no N81–N174 backfill), but the 2.0.0 entry MUST carry a Breaking Changes / Migration section.
- **2.0.0 is a true major** — the module/agent composition v2 (N89) is breaking for consumers.
- **Consolidate to `packages/taskflow/CHANGELOG.md`**; root becomes a pointer. Keep bare `v*` tag format.
- **Scope:** single task (pipeline + hardening + audit). npm-side OIDC registration is a documented manual prerequisite the user owns.

## Open questions

- Exact breaking surface of module composition v2 (N89) to document in the migration notes — to be pinned during implementation by reading N89.
- Whether `actionlint` is available in CI for workflow validation (nice-to-have).

## Sources

- `packages/taskflow/package.json` (version 1.0.0, scripts, publishConfig), `.github/workflows/` (absent), `git tag`/`git remote` (public repo, bare `v*` tags), `gh repo view` (PUBLIC), `npm view insight-flow` (1.0.0 latest), N80 TASK.md (manual release pattern), 0-byte CHANGELOG files.

## Handoff brief

feat / high / tags: release, ci, security, publish. Add release-please Release-PR workflow (bare `v*` tags) + `release-publish.yml` (release-published only, OIDC publish with provenance, no token), consolidate changelogs to the package one with a fresh `[2.0.0]` + Breaking/Migration section, harden for public repo (least-privilege permissions, SHA-pinned actions, tag/release-only triggers, git-history secret scan). Pipeline lands first; cutting 2.0.0 is a post-merge human step. Manual npm-side OIDC registration documented for the user.
