# N13 — Release insight-flow v0.4.0 with changelog N05–N12 — Review

**Reviewer:** Task Reviewer (AI)
**PR:** No PR yet — branch `feat/N13-release-insight-flow-v0-4-0`
**Verdict:** REQUEST CHANGES

---

## Summary

Implementation is partially complete. The file-level changes (version bump, CHANGELOG) are done and correct locally, but three checklist items are unmet: the files are not committed/pushed to the branch, the npm publish failed (2FA blocker), and the git tag does not exist. Risk: **low** — no source code changes, release mechanics only.

---

## Checklist verification

- [x] `packages/taskflow/package.json` version is `0.4.0` — confirmed locally
- [x] `packages/taskflow/CHANGELOG.md` exists with a `## [0.4.0]` section — confirmed, well-written
- [x] CHANGELOG covers all 8 tasks: N05–N12 — all present (Features: N07, N12×3; Improvements: N05, N06, N09, N10, N11)
- [x] `pnpm --filter insight-flow run build` exits 0 — confirmed during implementation
- [x] `npx tsc --noEmit` passes — confirmed during implementation
- [ ] `npm publish` succeeds — **FAIL**: `npm show insight-flow version` returns `0.3.1`; publish blocked by 2FA
- [ ] Git tag `v0.4.0` created and pushed — **FAIL**: `git tag --list 'v0.4.0'` returns empty
- [ ] `npm show insight-flow version` returns `0.4.0` — **FAIL**: returns `0.3.1`

## Quality gate results

- `npx tsc --noEmit` — ✓
- `pnpm run build` — ✓
- No regressions — version-only change, no source impact

---

## Blockers

### Blocker 1 — npm publish incomplete

`npm show insight-flow version` returns `0.3.1`. The publish failed due to 2FA requirement. User must authenticate and publish.

**Fix:** Run with OTP: `cd packages/taskflow && npm publish --access public --otp=<CODE>`
Or use an Automation token in `~/.npmrc` and re-run publish.

### Blocker 2 — git tag `v0.4.0` not created

No tag exists on the repo. The tag step must follow a successful publish and a commit of the release files.

**Fix:** After publish and commit:
```bash
git tag v0.4.0
git push origin v0.4.0
```

### Blocker 3 — `package.json` and `CHANGELOG.md` not committed to branch

Both files exist locally with correct content but are not staged or pushed to `feat/N13-release-insight-flow-v0-4-0`. The branch diff only contains spec docs.

**Fix:** Stage and commit: `git add packages/taskflow/package.json packages/taskflow/CHANGELOG.md` then push.

---

## CHANGELOG quality (non-blocking)

The CHANGELOG content is accurate and well-structured. One minor note: N08 is listed under Features but not N09 in the same section — N09 correctly lands under Improvements. No changes needed.

---

## Next actions

1. Commit `package.json` + `CHANGELOG.md` to the branch.
2. Complete npm publish (OTP or Automation token).
3. Create and push `v0.4.0` tag.
4. Verify: `npm show insight-flow version` → `0.4.0`.
