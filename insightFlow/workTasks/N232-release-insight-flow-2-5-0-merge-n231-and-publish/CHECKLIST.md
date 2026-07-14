# N232 — Release insight-flow 2.5.0 — merge N231 and publish — Checklist

## Release-check findings (all green — no gaps)

- [x] Tests pass — 353/353 (`pnpm --dir packages/taskflow test`)
- [x] Intent classified — MINOR → **2.5.0** (additive features N229 + N231; no breaking change)
- [x] Docs audited — no N231 docs changes needed (conventional commit → release-please changelog)

## Done criteria (merge + release steps — for the publisher)

- [ ] **Merge N231 PR #149** into `main` (squash) — gated, human-approved
- [ ] `git checkout main && git pull` — `main` now contains the N231 commits
- [ ] Record N231 on main: `insight-flow merge --id N231` then `insight-flow done --id N231` (no `insight-flow push` for bookkeeping)
- [ ] release-please opens/updates the release PR bumping `packages/taskflow` → **2.5.0** + `CHANGELOG.md`
- [ ] Confirm the release PR version + changelog (N229 + N231 features listed)
- [ ] **Merge the release-please PR** → tags `insight-flow@2.5.0`, triggers npm-publish — gated, human-approved
- [ ] Approve the pending publish deployment (`gh api .../pending_deployments`); watch npm@12/Node-20 pin
- [ ] Mark N232 released/done

## Quality gates

- [x] Tests pass (353/353) — verified by the release check
- [ ] Publish workflow green (npm-publish job succeeds)

## Verification

- [ ] PR #149 shows `MERGED`; N231 status `done`
- [ ] `npm view insight-flow version` → `2.5.0`
- [ ] Published build loads the redesigned hub overview (smoke `insight-flow ui` / `master`)
