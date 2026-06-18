# N145 — prompt wiring — auto-vs-gated handover language + in-session chaining — Checklist

## Done criteria

- [ ] `handoverSection` body finalized: candidate listing + free-pick + auto-chains / gated-stops language
- [ ] Permissions/consent caveat present (auto ≠ bypass `AgentGitPermissions` or consent)
- [ ] Cycle guard + gated-silent-user rules in the prompt
- [ ] Shared handover-safety clauses added to enforcement/protocol modules + root `AGENT_ENFORCEMENT.md`/`AGENT_PROTOCOL.md`
- [ ] All affected `*_ROLE.md` regenerated via `prompt-build --compose --apply`

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm --dir packages/taskflow test` passes (incl. updated compose + byte-identical MD check)
- [ ] Role templates stay in sync (`sync-role-templates.mjs`)
- [ ] No regressions to other composed sections

## Verification

- [ ] Compose test asserts auto + gated wording (command name, "STOP"/"go-ahead", permissions caveat)
- [ ] Manual read of a regenerated `*_ROLE.md` shows a coherent `## Handover` section + safety clauses
