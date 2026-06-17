# N141 — Guarded cleanup of stray doubled workTasks dirs in migrate-layout — Checklist

## Done criteria

- [ ] `migrate-layout` detects `<workDir>/workTasks/Nxx-…` doubled strays and skips cleanly when none exist.
- [ ] Dry-run is the default: detection report printed, nothing deleted without an explicit apply flag.
- [ ] Apply flag removes only scaffold-only/empty strays; content-bearing strays are preserved and reported with a reason.
- [ ] "Scaffold-only" rule for `REVIEW.md` is implemented and documented.
- [ ] Per-stray report distinguishes would-remove / removed / preserved-because-….

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] New tests pass (empty-scaffold removed, content-bearing preserved, dry-run deletes nothing)
- [ ] No regressions in affected area

## Verification

- [ ] Dry-run on a seeded stray prints the report and leaves the filesystem untouched.
- [ ] Apply on a seeded empty-scaffold stray removes it; a content-bearing stray remains and is reported preserved.
- [ ] `pnpm --dir packages/taskflow test` green; `pnpm typecheck`, `lint`, `format:check` pass.
