# N47 — git-approval-config-local-vs-remote-and-readme — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-26
**PR:** https://github.com/Slavo775/insight-flow/pull/30
**Verdict:** fix-needed

## Summary

Adds `remoteOps?: "allow" | "deny"` to `AgentGitPermissions` as a shorthand that blocks all origin-touching ops at once, with individual flags as overrides. The TypeScript type, config merge logic, dashboard rendering, init scaffold, and README are all updated correctly and the build passes. One blocker: `AGENT_CONFIG.md` — the live protocol file `task-git` reads at runtime — was not updated, so agents reading the raw config file will silently ignore `remoteOps: "deny"` and proceed with all operations allowed. The feature appears to work from the server/dashboard perspective but does not deliver its core user value (blocking agent operations).

## Checklist verification

- [x] `AgentGitPermissions` in `packages/taskflow/src/types.ts` has `remoteOps?: "allow" | "deny"` with comment — **pass** (`types.ts:252-253`)
- [ ] `AgentGitPermissionsSchema` in `packages/taskflow/src/schema/index.ts` validates `remoteOps` — **skipped** (no such schema exists; handled in `config.ts` instead — acceptable, but checklist item was never resolved)
- [x] Permission evaluation code respects `remoteOps: "deny"` as default-deny for remote ops — **pass for server/dashboard** (`config.ts:61-74`); **fail for agent runtime** — see Blocker 1
- [x] `packages/taskflow/README.md` has dedicated git permissions section with example JSON block and flag table — **pass**
- [x] Init scaffold includes `remoteOps` field — **pass** (`init/index.ts:636-650`)
- [x] `pnpm --dir packages/taskflow run build` passes — **pass** (verified in implementation)

## Blockers

1. **`AGENT_CONFIG.md` not updated — `remoteOps` silently ignored by agents at runtime**

   `AGENT_CONFIG.md` is the protocol `task-git` reads at the start of every run. Its config-reading snippet reads the **raw** `taskflow.config.json`:
   ```bash
   cat taskflow.config.json | node -e "
     const c = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
     console.log(JSON.stringify(c?.agents?.git?.permissions ?? {}));
   "
   ```
   With `agents.git.permissions: { "remoteOps": "deny" }` in the raw config, this outputs `{"remoteOps":"deny"}`. The agent then checks individual flags (`push`, `forcePush`, etc.) — all absent — and per the current protocol ("If the flag is absent, treat all flags as `true`") proceeds with every remote operation. The entire user-facing promise of `remoteOps: "deny"` — blocking agent pushes and PR creation — is silently defeated.

   **Fix**: Add a step to `AGENT_CONFIG.md` between the config-read and the per-operation checks:
   ```
   2a. If permissions contains `remoteOps: "deny"`, treat push / forcePush /
       deleteBranchRemote / createPR as false UNLESS that flag is explicitly
       set to true in the same permissions object.
   ```
   This mirrors exactly what `config.ts:resolveConfig` already does for the server side.

## Non-blocking

1. **CHECKLIST.md item 2 (`AgentGitPermissionsSchema`) was never marked resolved.** The implementation correctly identified that no Zod schema exists for `AgentGitPermissions` and handled `remoteOps` in `config.ts` instead. The checklist item should have been annotated as "N/A — no config Zod schema; handled in config.ts" rather than left unchecked with no note.

2. **README `merge` classification.** The flag table marks `merge` as "Remote? no / Covered by remoteOps? no". Goal item 1 originally listed `merge` in the shorthand's scope. The implementation plan and verification are the authoritative source and both exclude `merge` — this is the correct decision (local merge is not origin-touching). The Goal text was imprecise. No code change needed, but a clarifying note in TASK.md Notes would help future maintainers.

3. **`"// remoteOps"` comment key in scaffold is inside the `permissions` object** (`init/index.ts:638`). The existing pattern puts comment keys at the `agents` level (`"// git"`, `"// extend"`), not nested inside sub-objects. This is cosmetically inconsistent and the comment key will be spread into `mergedAgentsGitPerms` as an extra string property (harmless, but untidy). Consider moving it to the `git` level as `"// permissions.remoteOps"` to match the existing comment-key style.

## Security & edge cases

- No authz gaps. The change is additive; missing `remoteOps` field preserves existing behaviour (defaults remain `true`).
- No injection risk — config is a local JSON file read from disk.

## Notes

- `AGENT_CONFIG.md` fix is a single prose addition; no code change required. It does not touch any TypeScript and does not require a rebuild.
- After the fix, the full intent is satisfied: `config.ts` resolves correctly for the server/dashboard, and `AGENT_CONFIG.md` applies the same logic at agent runtime.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-26
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

"approved! done merge it"
