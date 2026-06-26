# N193 — Auto-publish on release — chain release-publish off release-please output (reusable workflow) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — reviewed the working tree on `fix/N193-auto-publish-on-release`)
**Verdict:** approved

## Summary

Two-file CI change implementing Option A: `release-publish.yml` becomes a reusable
workflow (`workflow_call` added, `release: published` kept), and `release-please.yml`
exposes `release_created`/`tag_name` and gains a conditional `publish` job that
`uses` the reusable workflow when a release was cut. Low risk, config-only, no
source/test impact. Matches the spec exactly. **Approved.**

## Checklist verification

- [x] `release-publish.yml` accepts `workflow_call` AND keeps `release: published` — pass (YAML parses; `on` = [release, workflow_call])
- [x] Publish job retains `environment: npm-publish` + `id-token: write` — pass (unchanged in release-publish.yml; OIDC granted at the caller `publish` job too)
- [x] `release-please.yml` step `id: release`; job outputs `release_created` (+ `tag_name`) — pass
- [x] `publish` job: `needs` + `if release_created == 'true'` + `uses` reusable wf — pass (valid reusable-call job: no `runs-on`/`steps`)
- [x] Stale comments corrected (chained-output model + mutual-exclusion) — pass
- [x] No double-publish — pass (see edge cases)
- [x] No secret/PAT introduced — pass (pure OIDC; no `secrets.*` referenced, so no `secrets: inherit` needed)

## Blockers

None.

## Non-blocking

1. **Checkout-ref robustness (optional hardening).** On the `workflow_call` path the
   reusable workflow's `actions/checkout` (no `ref`) checks out the caller's push
   SHA — which today *is* the version-bumped release commit, so it publishes the
   right version (verified below). If you ever want belt-and-suspenders against a
   future change where the release commit ≠ push HEAD, add a `ref` input to
   `release-publish.yml` and pass `needs.release-please.outputs.tag_name`. Not
   needed now; `tag_name` is already exposed if you want it.

## Security & edge cases

- **Checkout ref (the subtle one) — verified correct.** `workflow_call` from
  `release-please.yml` runs at the main-push SHA = the merged release-PR commit,
  whose `package.json` is the bumped version; the `v*` tag points at the same
  commit. So `npm publish` ships the intended version on both paths.
- **No double-publish — verified.** Bot (release-please) release → `release: published`
  is suppressed (GITHUB_TOKEN) → only the `workflow_call` path runs. Human manual
  release → no push to `main` → `release-please.yml` doesn't run → only
  `release: published` runs. Mutually exclusive.
- **OIDC through `workflow_call`** — `id-token: write` granted on the caller
  `publish` job and on the called job; the trust boundary stays `push: main` /
  `workflow_call` (never `pull_request`), so OIDC is never exposed to fork code.
- **`environment: npm-publish` approval gate** still applies to the called job.

## Notes

- Verification is necessarily static (GitHub Actions can't run locally); both files
  parse and the job structure is valid. True end-to-end confirms on the **next**
  release cycle. This does not retroactively publish **v2.1.0** (still pending at
  its approval gate from the immediate fix) — by design (out of scope).
- Lineage: N175 (release pipeline). Decision trail: this folder's `ANALYSIS.md`.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-26
**Verdict:** approved

### Summary

(verbatim) "approved merge it" — owner approved; proceed to merge `fix/N193-…`
into `main` so the chained auto-publish is live for the next release.

### Blockers

None.

### Notes

End-to-end confirms on the next release-please cycle. The waiting v2.1.0 publish
is separate (out of scope).
