# N252 — Release insight-flow 2.11.0 — ship N251 update-available toast + insight-flow update CLI — Checklist

## Doc gaps to fix (from release check → task-release-fix)

- [x] `website/docs/cli/setup-and-dashboard.md` — added an `update` row to the command table (line 18).
- [x] `website/docs/built-ins/master-server.md` — added `updateCheck` to the config table (line 257; default `{ enabled: true, intervalHours: 12 }`; `enabled:false` → no npm call, `latest: null`).
- [x] `website/docs/built-ins/master-server.md` — added `GET /api/version` to the endpoints table (line 333, trusted/403) + the update-available toast paragraph in the overview (lines 68–71, anchored to `#endpoints`).
- [x] `website/docs/configuration.md` (line 272) — `~/.insight-flow/master.json` shape now `{ port, standalone, updateCheck }`.
- [x] `website/docs/cli/index.md` (line 37) — added `update` to the Setup & Dashboard group summary.

## Release steps

- [ ] N251 feature PR merged into `main` (as `feat(master): ... (N251)` — commit `d73acd5`) → triggers release-please. *(task-release-merge)*
- [ ] Release-please 2.11.0 bump PR merged (version + CHANGELOG). *(task-release-ship, gated)*
- [ ] npm publish of 2.11.0 succeeds (approve the pending deployment env).
- [ ] Release notes / CHANGELOG mention the new default outbound npm check on hub load (throttled 12h, disableable).

## Quality gates

- [x] `npx tsc --noEmit` passes (re-check, 2026-07-18)
- [x] Tests pass — 369/369 (re-check; first-run flake on master-boot test cleared on re-run)
- [x] Docusaurus docs verified by re-audit — all 4 gaps closed, `#endpoints` anchor resolves (full site build not run; content + anchors confirmed)

## Verification

- [ ] `npm view insight-flow version` returns `2.11.0` after publish.
- [ ] Docusaurus renders the new `update` command, `updateCheck` config, and `GET /api/version` endpoint.
