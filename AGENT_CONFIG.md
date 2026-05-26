# AGENT_CONFIG — Runtime config reading protocol

This file documents config checks that agents perform at runtime — behavioural
guards that cannot be baked in at prompt-load time.

Agent extensions (`agents.extend`) are applied at `insight-flow init` /
`prompt-build` time and are already present in your loaded prompt; you do not
need to read the config for them. See `AGENT_PROTOCOL.md` — "EXTENDING WITH
PROJECT-SPECIFIC COMMANDS" for that model.

---

## GIT PERMISSIONS (`agents.git.permissions`)

**Applies to: task-git only.**

At the start of every task-git run:

1. Extract permissions from config:
   ```bash
   cat taskflow.config.json | node -e "
     const c = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
     console.log(JSON.stringify(c?.agents?.git?.permissions ?? {}));
   "
   ```
2. If the extracted permissions contain `remoteOps: "deny"`, treat `push`,
   `forcePush`, `deleteBranchRemote`, and `createPR` as `false` — unless
   that flag is explicitly set to `true` in the same permissions object.
   Example: `{ "remoteOps": "deny", "push": true }` → `push` is allowed;
   `forcePush`, `deleteBranchRemote`, `createPR` are blocked.
3. Before each operation, check the corresponding flag. If the flag is explicitly
   `false` (or resolved to `false` via `remoteOps` in step 2), skip the operation
   and print:
   ```
   ⛔ Blocked by config: agents.git.permissions.<key> = false
      To unblock: set "<key>": true in taskflow.config.json → agents.git.permissions.
   ```
4. If `agents.git.permissions` is absent, treat all flags as `true`.

| Operation                   | Config key           |
|-----------------------------|----------------------|
| remoteOps shorthand         | remoteOps            |
| git checkout -b <branch>    | createBranch         |
| git checkout <branch>       | checkout             |
| git commit                  | commit               |
| git push / git push -u      | push                 |
| git push --force            | forcePush            |
| git merge                   | merge                |
| git branch -d               | deleteBranchLocal    |
| git push origin --delete    | deleteBranchRemote   |
| gh/glab pr/mr create        | createPR             |
