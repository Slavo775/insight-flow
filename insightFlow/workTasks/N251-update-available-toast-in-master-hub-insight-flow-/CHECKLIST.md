# N251 — Update-available toast in master hub + insight-flow update CLI — Checklist

## Done criteria

- [x] `updateCheck: { enabled, intervalHours }` added to `MasterServerConfig` + Zod schema, default `{ true, 12 }` (master.json is the global hub's config home).
- [x] `fetchLatestVersion()` npm helper in master: interval-cached, returns `null` (silent) on any error, skipped when `updateCheck.enabled === false`.
- [x] `GET /api/version` returns `{ current, latest, updateAvailable }`; `current` from package.json; `latest` validated as semver.
- [x] Master hub fetches `/api/version` on load and renders the update banner when `updateAvailable`.
- [x] Banner is dismissible; dismissed version stored in `localStorage` (`tf-dismissed-update`), no re-nag for same `latest`.
- [x] `insight-flow update` CLI: global `npm i -g insight-flow@latest` + prints registered projects with `/task-release-rollout` pointer.
- [x] No web endpoint executes install/mutates projects; fetched `latest` never shell-interpolated (fixed literal argv).
- [x] README documents `insight-flow update` + `updateCheck` config.

## Quality gates

- [x] `pnpm --dir packages/taskflow build` passes
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (only 2 pre-existing FlowEditor warnings, unrelated)
- [x] No regressions — 369/369 tests pass

## Verification

- [x] Stubbed higher `latest` → `/api/version` reports `updateAvailable: true, latest`.
- [x] `updateCheck.enabled: false` → endpoint returns `latest: null`, no toast.
- [x] npm unreachable → `latest: null`, no error, no toast (verified — sandbox blocks network).
- [x] Malicious non-semver npm response (`"1.0.0; rm -rf ~"`) → rejected, `latest: null`.
- [ ] `insight-flow update` CLI — NOT run (would perform a real global install); logic is a fixed-literal `npm i -g` + hub.json listing.
