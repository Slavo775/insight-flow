# N78 — Analysis (pre-taskmaster strategist audit trail)

_Produced by `/task-analyze` on 2026-06-02, before handoff to `/taskmaster`._

## Problem framing

The human asked to (1) make Cursor work with bulk/batch init, (2) rename the `batch` CLI commands to `bulk`, and (3) store an editor value (cursor/claude/…) in the init config so bulk knows what to scaffold. Reading the code (`commands/batch-ui.ts`, `global-config.ts` registry, `cli.ts`) showed the command family is inconsistently named — `ui-batch-register`/`ui-batch-unregister`/`ui-batch-down`/`batch-ui` (registry + multi-dashboard launch) vs `bulk-init`/`bulk-prompt-build` (cross-project ops). The registry stores `BatchUiEntry = { label, path }` globally with no editor. `bulk-init` (`cmdBatchInit`) spawns `insight-flow init` per registered project and does **not** pass `--editor`.

**Key insight:** "cursor bulk init" mostly works *already* — N75 made `init` auto-detect the editor (`.claude/` vs `.cursor/`), so `bulk-init` scaffolds cursor for any project with a `.cursor/` dir. The real gap is **explicit per-project editor control** (#3), which is the enabler for the rest.

## Goal

Unify the command naming on `bulk-*` (with deprecated aliases) and add `config.editor` so `init` and `bulk-init` scaffold the chosen editor per project (incl. forcing Cursor across the fleet).

## Options considered

**Naming shape / compatibility:**
1. **Flat rename + deprecated aliases (CHOSEN)** — `bulk-register`/`bulk-unregister`/`bulk-down`/`bulk-ui`; old `batch-*`/`ui-batch-*` keep working with a deprecation warning for one release. No broken scripts.
2. Flat rename, hard break — cleaner but breaks existing usage. Rejected.
3. `bulk <subcommand>` namespace — tidiest long-term but bigger dispatch refactor + bigger break. Rejected for now.

**Editor source of truth:**
1. **`config.editor` in `taskflow.config.json` + `bulk-init --editor` override (CHOSEN)** — single source; `init` precedence flag → config → auto-detect → claude; `bulk-init` runs each project's init (honors its config) for free, plus a fleet override flag. Registry stays `{label, path}`.
2. Store editor in the batch registry — makes a global registry the source of truth for a project-level concern; a standalone `init` wouldn't benefit. Rejected.

**Scope:**
1. **One combined task (CHOSEN by human)** — rename + editor-aware bulk together.
2. Split into two — keeps the breaking rename isolated; not chosen.

## Decision

Single task: flat `bulk-*` rename with warning-emitting aliases (registry untouched) + `config.editor` (`claude`/`cursor`/`all`) threaded into `selectProviders` precedence + `bulk-init --editor` fleet override. Cursor bulk scaffolding then falls out of per-project `config.editor` (no new bulk engine).

## Open questions

1. Is `taskflow.config.json` schema-validated on read? If yes, add `editor` to that Zod schema; if it's loaded loosely, just add to `TaskflowConfig` + document. (Implementer to confirm in `config.ts`/`schema`.)
2. How long do the deprecated aliases live? (Proposed: one minor release; add a CHANGELOG note for removal.)
3. Should `bulk-prompt-build` also gain `--editor`? (Likely not — prompt-build re-syncs role files, not editor scaffolding; leave out unless trivial.)

## Sources

- Repo: `packages/taskflow/src/commands/batch-ui.ts` (registry + `cmdBatchInit`/`cmdBatchPromptBuild` + `cmdUiBatchRegister`), `global-config.ts` (registry storage), `cli.ts` (dispatch + help), `types.ts` (`TaskflowConfig`, `BatchUiEntry`), `init/index.ts` + `init/providers/index.ts` (N75 `selectProviders`), `schema/index.ts` (N76 `ProviderSchema`).
- Prior art: N75 (provider seam + `--editor` + auto-detect), N76 (`provider` plumbing + `ProviderSchema`).

## Handoff brief (as sent to /taskmaster)

> **Title:** Rename batch→bulk CLI (deprecated aliases) + editor-aware init/bulk via config.editor · **Type:** feat · **Priority:** medium · **Tags:** cli, bulk, multi-editor, cursor, init, dx
>
> Rename `ui-batch-*`/`batch-ui` → `bulk-*`, keeping old names as warning-emitting aliases (registry file/format unchanged). Add optional `editor` (claude/cursor/all) to `TaskflowConfig` + schema; `initProject` resolves editor as flag → `config.editor` → auto-detect → claude, so per-project init and `bulk-init` scaffold the right editor (incl. cursor); add a `bulk-init --editor` fleet override. Update help, README, CLAUDE.md, tests. Out of scope: registry schema, dashboard-launch behavior, OpenAI provider.
