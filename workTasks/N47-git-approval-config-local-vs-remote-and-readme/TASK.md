# N47 — git-approval-config-local-vs-remote-and-readme

**Type:** feat
**Priority:** medium
**Created:** 2026-05-26

## Problem

The current `agents.git.permissions` in `taskflow.config.json` is a flat bag of booleans (`push`, `forcePush`, `merge`, `deleteBranchLocal`, `deleteBranchRemote`, `createPR`, …). There is no structural distinction between local operations (safe, reversible) and remote/origin operations (potentially irreversible, touch shared state). A user who wants "allow all local, block all remote" must enumerate 4–5 individual flags. Additionally, the README documents this config as a single bullet point — no example block, no explanation of defaults, no guidance on the local/remote split.

## Goal

1. Extend `AgentGitPermissions` in `packages/taskflow/src/types.ts` with a `remoteOps` shorthand property (`"allow" | "deny"`) that simultaneously controls all origin-touching operations (`push`, `forcePush`, `deleteBranchRemote`, `createPR`, and remote `merge`).
2. Individual flags retain their meaning and override the shorthand when present (granular beats coarse).
3. Update the Zod schema in `packages/taskflow/src/schema/index.ts` to validate the new field.
4. Document a dedicated **Git permission gates** section in `packages/taskflow/README.md` with a config example, the `remoteOps` shorthand, and a table of all flags with their defaults.
5. `insight-flow init` scaffold (`packages/taskflow/templates/task/taskflow.config.json.tpl` or equivalent) reflects the updated schema.

## Scope

### In scope

- `packages/taskflow/src/types.ts` — add `remoteOps?: "allow" | "deny"` to `AgentGitPermissions`.
- `packages/taskflow/src/schema/index.ts` — add `remoteOps` to the `AgentGitPermissionsSchema` Zod object.
- `packages/taskflow/src/commands/task-git.ts` (or wherever git permission guards are applied) — evaluate `remoteOps: "deny"` to short-circuit remote operations when individual flags are not set.
- `packages/taskflow/README.md` — replace the one-liner bullet with a proper section: heading, explanation of local-vs-remote split, full config example JSON block, flag table with defaults, and the `remoteOps` shorthand.
- `packages/taskflow/templates/` — update the init scaffold config template if it exists.

### Out of scope

- Changing the boolean flags themselves (no renames, no removals).
- Any UI/dashboard changes.
- Changing how `task-git` prompt text is generated — this is a runtime schema + enforcement change only.
- Migration of existing `taskflow.config.json` files (existing configs remain valid, `remoteOps` is additive).

## Implementation plan

1. **Extend the TypeScript interface** (`packages/taskflow/src/types.ts` line ~252).
   - Add `remoteOps?: "allow" | "deny";` with comment `// shorthand: controls all origin-touching ops unless overridden by individual flags`.
   - "Remote ops" covered by the shorthand: `push`, `forcePush`, `deleteBranchRemote`, `createPR`.

2. **Update the Zod schema** (`packages/taskflow/src/schema/index.ts`).
   - Find `AgentGitPermissionsSchema` (search for `createBranch`).
   - Add `.remoteOps(z.enum(["allow", "deny"]).optional())`.

3. **Apply shorthand in permission evaluation** (locate where `AgentGitPermissions` is read to gate operations — likely `packages/taskflow/src/commands/task-git.ts` or a shared `permissions.ts` helper).
   - When `remoteOps === "deny"`, treat `push`, `forcePush`, `deleteBranchRemote`, `createPR` as `false` unless the individual flag is explicitly `true`.
   - When `remoteOps === "allow"` (or absent), existing per-flag defaults apply unchanged.

4. **Update README** (`packages/taskflow/README.md`).
   - Find the existing "Git permission gates" bullet (line ~10) and replace with a dedicated `## Git permission gates` section (or add under `## Configuration` if such a section exists).
   - Include: explanation of local vs remote split, full example JSON, flag table (flag | default | remote?), and `remoteOps` shorthand description.

5. **Update init scaffold template** — search `packages/taskflow/templates/` for any `taskflow.config.json` template. If found, add `"remoteOps": "allow"` under `agents.git.permissions` so new projects see the field scaffolded.

6. **Build and typecheck** — `pnpm --dir packages/taskflow run build` must pass with no TS errors.

## Verification

- `pnpm --dir packages/taskflow run build` exits 0.
- In a config with `agents.git.permissions.remoteOps: "deny"` and no individual overrides, `push` / `forcePush` / `deleteBranchRemote` / `createPR` are blocked; `commit` / `createBranch` / `checkout` / `deleteBranchLocal` are allowed.
- In a config with `remoteOps: "deny"` but `push: true`, `push` is allowed (individual override wins).
- README `## Git permission gates` section renders correctly with example JSON block and flag table.

## Notes

- Related: the flat boolean approach was introduced alongside N26/N27 git-permission work.
- The `remoteOps` shorthand maps to the "remote" column in the flag table — makes it easy to audit which flags it covers.
- Do not add `pull` / `fetch` as permission-gated ops in this task — out of scope and those aren't Claude Code–initiated in normal workflow.
