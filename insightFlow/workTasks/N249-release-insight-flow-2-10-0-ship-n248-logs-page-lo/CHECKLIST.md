# N249 — Release insight-flow 2.10.0 — ship N248 logs page Lovable redesign + search/counts — Checklist

## Release readiness (from release-check)

- [x] Tests pass — 369/369 (`pnpm --dir packages/taskflow test`)
- [x] Intent clear — feature → minor (2.9.0 → 2.10.0); `feat(logs):`, PR #163
- [x] Docs complete — gap closed (see below)

## Gaps to close (before release)

- [x] Update `website/docs/guides/debug-logs.md` for N248:
  - [x] add the `search` query param to the `/api/logs` params table
  - [x] add `counts` (`{ error, warning, info }`) to the response example + a line
  - [x] update the "Reading the logs" section — the `/logs` page now has a search
        box + level chips with counts (was project/level dropdowns)
- [x] Commit the docs update to PR #163 (`f82ed35`); Docusaurus build passes

## Release steps

- [ ] Merge feature PR #163 (`feat/N248-…`) into `main` (Release Merger)
- [ ] Confirm release-please opens the `chore(main): release 2.10.0` PR
- [ ] Human go-ahead → merge the release PR (Release Publisher) → tags `v2.10.0`
- [ ] Approve the npm-publish deployment (OIDC ENEEDAUTH fallback: manual
      `gh workflow run release-publish.yml --ref main`)
- [ ] Confirm `npm view insight-flow version` == 2.10.0
- [ ] Roll out: global `npm i -g insight-flow@2.10.0` + bulk-registered projects

## Verification

- [ ] `http://localhost:6100/logs`: search filters all logs, chips show counts,
      colored collapsible rows — matches the shipped design.
