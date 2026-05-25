# N42 — Git operation permissions in config with task-git enforcement

**Type:** feat
**Priority:** high
**Created:** 2026-05-25

## Problem

Some projects should not allow `task-git` to push to remote, create PRs, or merge — only local git operations (branch, checkout, commit) should be permitted. There is currently no way to express this in config; the agent always attempts all operations regardless.

## Goal

1. `taskflow.config.json` gains an `agents.git.permissions` block with a true/false flag for every distinct git operation `task-git` can perform.
2. `task-git` reads the permissions block at startup and refuses any blocked operation with a clear message naming the exact config key to change.
3. `AGENT_NOTIFY.md` documents the permission-check protocol so every invocation of task-git enforces the rules automatically.
4. `insight-flow init` scaffolds the permissions block with all operations defaulting to `true` (fully backwards-compatible).

## Scope

### In scope

- `packages/taskflow/src/types.ts` — add `AgentGitPermissions` interface and `git?: { permissions?: AgentGitPermissions }` to `AgentsConfig`.
- `packages/taskflow/src/config.ts` — merge `agents.git.permissions` defaults (all `true`, except `forcePush: false`) into `DEFAULTS`.
- `AGENT_NOTIFY.md` — replace blank body with the git-permission enforcement protocol.
- `packages/taskflow/src/init/index.ts` — scaffold `agents.git.permissions` block in the generated `taskflow.config.json`.

### Out of scope

- No changes to any CLI command other than `init`.
- No changes to any other agent role file.
- No UI / dashboard changes.
- No schema/Zod changes — `TaskflowConfig` is not validated through Zod; the type + config defaults are sufficient.

## Implementation plan

1. **`types.ts` — add `AgentGitPermissions` interface**
   - Add:
     ```ts
     export interface AgentGitPermissions {
       createBranch?: boolean;       // git checkout -b
       checkout?: boolean;           // git checkout <existing branch>
       commit?: boolean;             // git commit
       push?: boolean;               // git push (to remote)
       forcePush?: boolean;          // git push --force
       merge?: boolean;              // git merge (to main)
       deleteBranchLocal?: boolean;  // git branch -d
       deleteBranchRemote?: boolean; // git push origin --delete
       createPR?: boolean;           // gh / glab pr/mr create
     }
     ```
   - Add `git?: { permissions?: AgentGitPermissions }` to `AgentsConfig` (after `extend?`).

2. **`config.ts` — defaults**
   - In `DEFAULTS`, under `agents`, add:
     ```ts
     git: {
       permissions: {
         createBranch: true, checkout: true, commit: true,
         push: true, forcePush: false, merge: true,
         deleteBranchLocal: true, deleteBranchRemote: true, createPR: true,
       },
     },
     ```
   - Deep-merge strategy: `resolveConfig` already spreads `userConfig` over `DEFAULTS`; the `agents` key is shallow-merged, so also deep-merge `agents.git.permissions` so a user setting `push: false` doesn't wipe the other keys. Add:
     ```ts
     const mergedAgentsGitPerms = {
       ...DEFAULTS.agents!.git!.permissions,
       ...(userConfig.agents?.git?.permissions ?? {}),
     };
     ```
     then assign it back into the resolved config.

3. **`AGENT_NOTIFY.md` — permission-check protocol**
   - Replace the blank body with:
     ```markdown
     ## GIT PERMISSIONS

     At the start of every task-git run:
     1. Run `cat taskflow.config.json` (or `insight-flow config show` if available) and extract `agents.git.permissions`.
     2. Before each operation, check the corresponding flag. If the flag is explicitly `false`, skip the operation and print:
        ⛔ Blocked by config: agents.git.permissions.<key> = false
        To unblock: set "<key>": true in taskflow.config.json → agents.git.permissions.
     3. If `agents.git.permissions` is absent, treat all flags as `true`.

     | Operation                   | Config key           |
     |-----------------------------|----------------------|
     | git checkout -b <branch>    | createBranch         |
     | git checkout <branch>       | checkout             |
     | git commit                  | commit               |
     | git push / git push -u      | push                 |
     | git push --force            | forcePush            |
     | git merge                   | merge                |
     | git branch -d               | deleteBranchLocal    |
     | git push origin --delete    | deleteBranchRemote   |
     | gh/glab pr/mr create        | createPR             |
     ```

4. **`init/index.ts` — scaffold permissions in new config**
   - In the generated `taskflow.config.json` string (find the `agents` block), add the `git.permissions` object with all keys and their default values so new projects see the full list and can edit in place.
   - Find the location via `grep -n "agents\|extend" packages/taskflow/src/init/index.ts`.

## Verification

- Set `"push": false, "merge": false` in this project's `taskflow.config.json → agents.git.permissions`.
- Run `/task-git commit and push` → agent must print the blocked message for `push` and halt before `git push`.
- Restore defaults → agent proceeds normally.
- Run `insight-flow init` in a temp dir → generated config contains `agents.git.permissions` with all 9 keys.
- TypeScript: `pnpm --dir packages/taskflow run build` passes.

## Notes

- `agents.extend.task-git` (free-text strings for PR commands) is separate from `agents.git.permissions` (structured booleans). Both coexist under `agents`.
- `forcePush` defaults `false` — matches the existing "NEVER force-push" rule in the task-git role and makes the safe-by-default posture explicit.
- All flags are optional in the type (`undefined` = allowed), which means the spread-defaults approach in `config.ts` gives the right behaviour without requiring every key to be present in user config.
