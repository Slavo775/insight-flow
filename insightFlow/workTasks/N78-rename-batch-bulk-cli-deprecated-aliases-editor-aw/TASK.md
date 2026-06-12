# N78 — Rename batch→bulk CLI (deprecated aliases) + editor-aware init/bulk via config.editor

**Type:** feat
**Priority:** medium
**Created:** 2026-06-02

## Problem

The cross-project CLI uses inconsistent naming — `ui-batch-register`/`ui-batch-unregister`/`ui-batch-down`/`batch-ui` (registry + multi-dashboard launch) alongside `bulk-init`/`bulk-prompt-build` (cross-project ops). And there's no way to tell `bulk-init` which editor to scaffold per project: it just runs `insight-flow init`, which auto-detects (N75). So forcing an editor (e.g. adding Cursor to a Claude-only project) across the registered fleet isn't possible. Unify the naming on `bulk-*` and make init/bulk editor-aware via a `config.editor` setting.

## Goal

1. All cross-project commands use the `bulk-*` prefix; old `batch-*`/`ui-batch-*` names keep working as deprecated, warning-emitting aliases for one release.
2. `taskflow.config.json` gains an optional `editor` (`claude` | `cursor` | `all`); `init` honors precedence `--editor` flag → `config.editor` → auto-detect → claude.
3. `bulk-init` scaffolds the right editor per project (via each project's `config.editor`) and supports a `--editor` fleet override.
4. Existing registrations + the registry format are untouched (no orphaning).

## Scope

### In scope

- `packages/taskflow/src/cli.ts` — rename dispatch: `ui-batch-register`→`bulk-register`, `ui-batch-unregister`→`bulk-unregister`, `ui-batch-down`→`bulk-down`, `batch-ui`→`bulk-ui` (carry `--add`/`--remove`/`--list`). Register the old names as deprecated aliases that emit a one-line `stderr` warning then dispatch to the new handler. Update `printHelp`.
- `packages/taskflow/src/commands/batch-ui.ts` — `cmd*` function names may be renamed for clarity (behavior unchanged); the no-projects hint strings should reference the new command names.
- `packages/taskflow/src/types.ts` — add `editor?: "claude" | "cursor" | "all"` to `TaskflowConfig`.
- `packages/taskflow/src/schema/index.ts` — add optional `editor` enum to the config schema (if config is schema-validated; otherwise document).
- `packages/taskflow/src/init/index.ts` — resolve `const editor = options.editor ?? config.editor` and pass to `selectProviders` (so precedence flag → config → auto-detect → claude).
- `packages/taskflow/src/init/providers/index.ts` — `selectProviders` already takes an editor arg; no change needed beyond confirming the precedence (config feeds the same arg).
- `bulk-init` (`cmdBatchInit`) — add `--editor` passthrough: when set, append `--editor <v>` to each project's `init` args (fleet override); otherwise each project's init uses its own `config.editor`.
- Tests + docs (README, CLAUDE.md).

### Out of scope

- Changing the registry schema / storage (stays `BatchUiEntry = { label, path }`; registry file path unchanged).
- The dashboard-launch behavior itself (port-finding, multi-select) — only the command *name* changes.
- The OpenAI/Codex provider. (Note: "cursor bulk init" largely already works via N75 auto-detect — this adds explicit per-project control, not a new bulk engine.)

## Implementation plan

1. **`config.editor` type + schema** — add `editor?: "claude" | "cursor" | "all"` to `TaskflowConfig` + optional enum in the config Zod schema (reuse N76's `ProviderSchema` style; `all` is config-only).
2. **init precedence** — in `initProject`, compute `options.editor ?? config.editor` and pass to `selectProviders(cwd, that)`. Confirm `--editor` flag still wins; absent both → auto-detect → claude. Add a test.
3. **Rename dispatch + aliases** — in `cli.ts`, switch the command strings to `bulk-register`/`bulk-unregister`/`bulk-down`/`bulk-ui`; add a small alias map (`{ "ui-batch-register": "bulk-register", "batch-ui": "bulk-ui", … }`) that, when an old name is used, prints `⚠ "<old>" is deprecated, use "<new>"` to stderr and falls through to the new handler.
4. **bulk-init --editor passthrough** — `cmdBatchInit` appends `--editor <v>` to the per-project `init` args when `opts.editor` is set.
5. **Help + docs** — update `printHelp`, README (the bulk/registry section), CLAUDE.md command list.
6. **Tests** — alias dispatch + deprecation warning; `config.editor` precedence (flag > config > auto-detect); `bulk-init --editor` passthrough builds the right args.

## Verification

- `pnpm --dir packages/taskflow run build` + `npx tsc --noEmit` clean; `pnpm --dir packages/taskflow test` passes.
- `insight-flow bulk-register` / `bulk-ui` / `bulk-down` work; `insight-flow batch-ui` still works but prints a deprecation warning.
- A `taskflow.config.json` with `"editor": "cursor"` → bare `insight-flow init` scaffolds cursor (no `--editor` flag needed); `--editor claude` overrides it.
- `bulk-init --editor all` re-inits every registered project for both editors.
- Existing registry entries still load (no format change).

## Notes

- Builds on N75 (provider seam + `selectProviders` + `--editor`) and N76 (`ProviderSchema`). `all` is valid in `config.editor`/`--editor` but is not a provider id — `selectProviders` already maps it to both providers.
- Deprecation aliases are temporary (one release); add a CHANGELOG note so they can be removed later.
- Registry file/location and `BatchUiEntry` format are load-bearing for existing users — do not touch.
