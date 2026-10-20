# N281 — Init and install never clobber user files — settings parse stop, cursor hooks merge, opt-outs, unmanaged conflicts

**Type:** fix
**Priority:** medium
**Created:** 2026-10-19

## Problem

`init` and the installer overwrite or delete files the user owns:

- If `.claude/settings.local.json` fails to parse, three installers replace it with `{hooks:…}`, so the user's permission allowlist and env are gone.
- `.cursor/hooks.json` is never merged: insight-flow hooks are silently skipped, or `--force` wipes the user's.
- Declining activity tracking or lifecycle hooks is not remembered. `init` even writes `enabled: true` before asking, so the next re-init installs them anyway.
- Installing writes over unmanaged same-name commands, skills or subagents, and uninstall later deletes them.
- `applyArtifacts` is not atomic, so a failure mid-way leaves hooks with no owner.
- Removing one owned hook deletes the whole matcher group, including user hooks in it.
- A built-in definition and `custom:<same>` map to the same file, so editing one silently destroys the other.
- Malformed JSON errors name no file.

Source: `N271/AUDIT.md` **A43, A44, A45, A47, A48**.

## Goal

1. No insight-flow code path ever writes over a user config file it could not parse. It stops and names the file.
2. `.cursor/hooks.json` is merged per event, like `.claude/settings.json`.
3. Every init answer (yes or no) is persisted and respected on re-init.
4. Install refuses to overwrite unmanaged files, applies all-or-nothing, and uninstall removes only what insight-flow owns.
5. Built-in overrides and custom definitions can never share a file.

## Scope

### In scope

- `packages/taskflow/src/agents/activity-hook.ts` (settings read/write ~:130-164, :261-293).
- `packages/taskflow/src/agents/notify-hook.ts` (~:91-125).
- `packages/taskflow/src/agents/cursor-hooks.ts` (~:180-193).
- `packages/taskflow/src/agents/init/index.ts` (~:99, :269-338).
- `packages/taskflow/src/agents/emit.ts` (`readJson` :127-130, `removeOwnedHook` :117-123, `applyCommands`/`applySkills`/`applySubagents` ~:263-426, `applyArtifacts` ~:497-501, :570-592, uninstall ~:676-698, :780-794).
- `packages/taskflow/src/agents/flow-install.ts` (~:84-93, :257-269).
- `packages/taskflow/src/dashboard/server/custom-defs.ts` (`fileFor` :57-63, write paths ~:201-211, :437).
- Tests.

### Out of scope

- Hook script content → N280.
- MCP install confirmation, secrets → N273.
- Built-in command bodies → N275.

## Implementation plan

1. **Never clobber on a parse error (A43).** One shared `readJsonStrict(path)` that returns `{}` only when the file is missing and throws `Error("<path>: malformed JSON (<msg>)")` otherwise. Use it in the three installers and in `emit.ts readJson`. Callers stop with that message; `init` prints which step stopped.
2. **Merge `.cursor/hooks.json` (A44).** Merge per event and dedupe by command string, mirroring how `emit` merges Claude hooks. `--force` replaces only insight-flow entries. Rewrite the scripts when their content differs.
3. **Persist answers (A45).** Write `activityEngine.enabled` from the user's answer, not before asking. Add a `hooks.lifecycle: false` (or similar) opt-out flag. Re-init and `--yes` respect stored answers. Interactive "n", `--yes` defaults and the hub modal all go through one code path.
4. **Unmanaged-file conflicts (A47).** In `applyCommands`, `applySkills` and `applySubagents`: if the target exists, is not claimed by any manifest bucket, and its content differs → throw `InstallConflict` naming the file (as is already done for mcp). Uninstall deletes only files whose content still matches what insight-flow wrote; otherwise it warns and keeps them.
5. **All-or-nothing apply (A47).** Run every conflict check before the first write, and save the manifest last. If a write fails mid-way, roll back what was written (the mcp snapshot-undo pattern already exists).
6. **Owned-entry removal (A47).** `removeOwnedHook` removes only the owned command entry inside a matcher group, and removes the group only when it becomes empty.
7. **Separate files for overrides vs custom (A48).** Store built-in overrides and `custom:` definitions under distinct names (e.g. `custom-<tail>.json` for custom, or an `overrides/` subfolder), with a one-time migration for existing files. Alternatively, refuse a write when the target file holds a different id; choose one in `/task-analyze` and keep `DefinitionIdSchema` bijective.
8. **Tests.**
   - A malformed `settings.local.json` is left byte-identical and the error names the file.
   - `.cursor/hooks.json` with user hooks keeps them after init and after `--force`.
   - Decline activity → re-init does not install it; `--yes` respects stored "no".
   - Installing `agent:taskmaster` over a user-edited `.claude/commands/taskmaster.md` → conflict, file unchanged.
   - Failure mid-apply leaves no orphan hooks.
   - A user hook in the same matcher group survives uninstall.
   - `custom:task-review` and an edited built-in `task-review` both survive.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new tests.
- Manual: add a trailing comma to `playground/.claude/settings.local.json`, run `insight-flow init --yes` → it stops with the file named, and the file is unchanged.
- Manual: in a project with your own `.cursor/hooks.json`, run init with Cursor → your entries are still present.

## Notes

- Detail and evidence: `N271/AUDIT.md` A43–A45, A47, A48. The trigger for A47 is an agent-target install of a built-in, or a custom flow with handover edges from a built-in source, not `installFlow("default")`.
- **Depends on N273, N275 and N280** (all edit `emit.ts`, `init/` or the hook installers).
- Recommended run: `/task-analyze N281` → `/task-implement N281`.
