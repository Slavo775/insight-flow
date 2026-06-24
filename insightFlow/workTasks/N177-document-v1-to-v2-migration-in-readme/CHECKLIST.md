# N177 — Document v1 to v2 migration in README — Checklist

## Done criteria

- [ ] New "Upgrading from 1.x to 2.0" subsection exists under `## Upgrading insight-flow` with the ordered command sequence.
- [ ] "Migration / utility" block lists `migrate-layout`, `migrate-reviews`, `migrate-hooks` (in addition to `migrate`), each with a one-line comment.
- [ ] Command names/flags/descriptions match `packages/taskflow/src/cli/cli.ts:139-146`.
- [ ] Existing mentions (lines 15, 147) cross-link to the new upgrade section.
- [ ] Note that migrations are idempotent and the legacy `workTasks/` layout still resolves via the back-compat shim.

## Quality gates

- [ ] Docs-only change — no `tsc` / lint / test impact (N/A; note in report if gates skipped).
- [ ] No regressions in affected area (README renders correctly on GitHub).

## Verification

- [ ] `grep -n "migrate-reviews\|migrate-layout\|migrate-hooks" packages/taskflow/README.md` returns hits in both the command block and the upgrade section.
- [ ] New subsection reads as a runnable, correctly-ordered upgrade path.
