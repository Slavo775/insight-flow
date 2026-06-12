# N39 — Release v0.6.0 — changelog, version bump, README — Checklist

## Done criteria

- [ ] `packages/taskflow/package.json` version is `0.6.0`.
- [ ] `packages/taskflow/CHANGELOG.md` has `## [0.6.0]` as first versioned section with all N23–N38 entries.
- [ ] `CHANGELOG.md` (root) has `## [0.6.0]` as first versioned section.
- [ ] `packages/taskflow/README.md` "What's new" block updated to 0.6.0.
- [ ] `packages/taskflow/README.md` no longer says "bundled React dashboard".
- [ ] Root `README.md` no longer says "live-reloads via SSE".
- [ ] Root `README.md` config table includes `activityEngine.enabled` and `notifications.sounds.enabled`.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0.

## Verification

- [ ] `grep '"version"' packages/taskflow/package.json` → `"0.6.0"`.
- [ ] `head -5 packages/taskflow/CHANGELOG.md` shows `## [0.6.0]`.
- [ ] `grep -c "N3[3-8]\|N2[3-9]\|N30\|N31\|N32" packages/taskflow/CHANGELOG.md` → 16 matches (all tasks referenced).
