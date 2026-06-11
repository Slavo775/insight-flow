# N90 — Migrate 9 shipped roles to composer-generated (JSON canonical) — Checklist

## Done criteria

- [ ] Renderer continuation rule: body-only section module joins the previous section block without a blank line
- [ ] All 9 roles have composed-agent defs + role-scoped modules; shared modules referenced only where wording matches byte-for-byte
- [ ] Composer output for each of the 9 roles is byte-identical to the committed `*_ROLE.md` (drift test asserts equality)
- [ ] `prompt-build --compose --apply` writes the 9 generated role files; per-file changed/unchanged summary; unknown agent refused
- [ ] `agents.extend` marked blocks survive generation — `prompt-build` non-compose path patches a generated role correctly
- [ ] `git diff` on the 9 role files after compose-apply is empty (zero behavioral change at switchover)
- [ ] `sync-role-templates.mjs` output for `templates/roles/` unchanged
- [ ] `insight-flow init` in the playground scaffolds roles whose `@includes` resolve
- [ ] `compose.ts` header comment updated: JSON canonical, MD generated
- [ ] No `AGENT_*.md` partial content modified

## Quality gates

- [ ] `pnpm build` passes
- [ ] Lint passes (no new findings vs main)
- [ ] `pnpm --filter insight-flow test` passes incl. 9-role byte-exact drift suite
- [ ] No regressions in `prompt-build` non-compose path

## Verification

- [ ] Byte-diff loop: `prompt-build --compose --apply && git diff --exit-code -- '*_ROLE.md'` exits 0
- [ ] Playground: `prompt-build` (extend path) on a generated role produces correctly patched output
