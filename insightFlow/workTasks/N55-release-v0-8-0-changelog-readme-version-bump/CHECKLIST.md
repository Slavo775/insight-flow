# N55 — release v0.8.0 — Checklist

## Done criteria

- [ ] N49 merged to main OR explicitly deferred with a note in `[Unreleased]`
- [ ] `packages/taskflow/CHANGELOG.md` has a `[0.8.0]` section with one bullet per included task
- [ ] `packages/taskflow/package.json` `version` field is `0.8.0`
- [ ] `packages/taskflow/README.md` has no references to `taskflow.prompt.json` or other stale content from N50–N54
- [ ] `pnpm build` passes after version bump
- [ ] `pnpm --dir packages/taskflow run sync-roles` passes (0 missing)
- [ ] Package published: `npm view insight-flow version` returns `0.8.0`

## Quality gates

- [ ] `pnpm build` — no TypeScript errors
- [ ] `pnpm --dir packages/taskflow run sync-roles` — 0 missing files

## Verification

- [ ] `npm view insight-flow version` → `0.8.0`
- [ ] `npm view insight-flow versions --json` shows 0.8.0 as latest
- [ ] CHANGELOG `[0.8.0]` section present and covers N45–N54 (minus any already in 0.7.1 if published)
