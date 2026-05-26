# N44 — Release 0.7.0 — changelog, README, and version bump — Checklist

## Done criteria

- [ ] `packages/taskflow/package.json` version is `0.7.0`.
- [ ] `packages/insight-flow-master/package.json` version is `0.7.0` (if versioned).
- [ ] `CHANGELOG.md` (root) contains `## [0.7.0]` section with N40–N43 entries.
- [ ] `packages/taskflow/CHANGELOG.md` contains the same `## [0.7.0]` section.
- [ ] `packages/taskflow/README.md` "What's new" heading reads `0.7.0` with four bullet points.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (no TS errors).

## Verification

- [ ] `cat packages/taskflow/package.json | grep '"version"'` → `"version": "0.7.0"`.
- [ ] `grep "\[0.7.0\]" CHANGELOG.md` → non-empty output.
- [ ] `grep "0.7.0" packages/taskflow/README.md` → "What's new in 0.7.0" present.
