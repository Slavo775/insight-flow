# N91 — Unify near-duplicate role wording onto shared modules — Checklist

## Done criteria

- [ ] Near-duplicate inventory documented (in PR body or ANALYSIS.md addendum) with adopt/keep/leave decision per bullet
- [ ] `minimal-diff`, `scope-guard`, `recorder-discipline` each referenced by ≥2 composed agents
- [ ] Role-specific qualifiers preserved as role-scoped bullets where nuance matters
- [ ] Regenerated `*_ROLE.md` committed together with the JSON; diff contains only unification changes
- [ ] No schema / renderer / CLI changes
- [ ] Templates re-synced via `sync-role-templates.mjs`

## Quality gates

- [ ] `pnpm build` passes
- [ ] Lint passes (no new findings vs main)
- [ ] `pnpm --filter insight-flow test` passes — drift suite green against regenerated files

## Verification

- [ ] `prompt-build --compose --apply` after the final commit reports all 9 `unchanged`
- [ ] Manual read of each changed role section confirms semantic equivalence (no new rules introduced)
