# N98 — Security as a first-class module — decompose enforcement, baseline trio on every agent — Checklist

## Done criteria

- [ ] `security` include module registered (`@AGENT_SECURITY.md`, described)
- [ ] All 10 composed defs reference `security`; consistent ordering documented; `task-git` also gains `protocol`
- [ ] `buildEnforcementBlock()` no longer emits `@AGENT_SECURITY.md`; repo-root `AGENT_ENFORCEMENT.md` regenerated without it
- [ ] All 10 role files regenerated via compose-apply; exactly one `@AGENT_SECURITY.md` per role file, zero in `AGENT_ENFORCEMENT.md` (no double-include)
- [ ] Templates re-synced
- [ ] Test: every composed def carries the baseline trio (security/enforcement/protocol)
- [ ] `AGENT_SECURITY.md` / `AGENT_PROTOCOL.md` content untouched

## Quality gates

- [ ] `pnpm build` passes
- [ ] Lint passes (baseline)
- [ ] `pnpm --filter insight-flow test` passes — drift suite ×10 green

## Verification

- [ ] `prompt-build --compose --apply` after final commit: all 10 `unchanged`
- [ ] Fresh-init smoke: scaffolded roles carry the security include; consumer AGENT_ENFORCEMENT.md regenerates without the embedded line
- [ ] `/agent/<any>` map shows the security node
