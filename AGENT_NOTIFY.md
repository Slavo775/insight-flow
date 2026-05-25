# AGENT_NOTIFY — intentionally blank

Notifications are handled exclusively by Claude Code hook scripts.
Agents must not call `insight-flow notify` or any notification command directly.

To opt in to AI-triggered notifications, configure `agents.extend` in `taskflow.config.json`.
See `packages/taskflow/README.md` — "Notifications" for the full model.

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
