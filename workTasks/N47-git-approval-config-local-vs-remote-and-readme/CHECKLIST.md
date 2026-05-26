# N47 — git-approval-config-local-vs-remote-and-readme — Checklist

## Done criteria

- [ ] `AgentGitPermissions` in `packages/taskflow/src/types.ts` has `remoteOps?: "allow" | "deny"` with comment.
- [ ] `AgentGitPermissionsSchema` in `packages/taskflow/src/schema/index.ts` validates `remoteOps`.
- [ ] Permission evaluation code (task-git or helper) respects `remoteOps: "deny"` as a default-deny shorthand for remote ops, with individual flags as overrides.
- [ ] `packages/taskflow/README.md` has a dedicated git permissions section with example JSON block and flag table.
- [ ] Init scaffold template (if present) includes `remoteOps` field.
- [ ] `pnpm --dir packages/taskflow run build` passes.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0 with no TS errors.
- [ ] No regressions in existing permission tests (if any).

## Verification

- [ ] Config with `remoteOps: "deny"` blocks `push`, `forcePush`, `deleteBranchRemote`, `createPR`; allows `commit`, `createBranch`, `checkout`, `deleteBranchLocal`.
- [ ] Config with `remoteOps: "deny"` + `push: true` allows `push` (individual override wins).
- [ ] README section renders with correct JSON example and table (manual review).
