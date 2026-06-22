# N165 — Install conflicts: templated `${VAR}` secret inputs + substitution + resolved overwrite/diff

**Type:** feat
**Priority:** high
**Created:** 2026-06-22
**Scope expanded:** 2026-06-22 (folds in the templated-inputs / secret-substitution feature)

## Problem

`.mcp.json already defines server 'context7' with a different config — refusing to overwrite` keeps happening for two reasons: (1) configs that carry a secret (e.g. an API key) can't be parameterised, so the stored config and the installed `.mcp.json` drift apart; and (2) `emit.ts` hard-refuses *any* difference with no diff and no overwrite. Claude Code's own `${VAR}` expansion can't be relied on here — expansion in `.mcp.json` **headers is broken** (anthropics/claude-code#51581) and context7 authenticates via an Authorization header — so insight-flow must own the substitution.

## Goal

1. Module configs may contain `${VAR}` placeholders; insight-flow derives one input per placeholder (title = `VAR`), with an optional `inputs: [{ name, title, description, secret }]` block to refine the title/description and mark secrets.
2. Install collects values — dashboard form (masked for secrets); CLI from the secrets store / env — and **substitutes resolved values into `.mcp.json`** at install.
3. Entered values persist to a **gitignored** local secrets store so re-install doesn't re-prompt.
4. The mcp conflict check compares **resolved** configs: same resolved value → idempotent (no false "different config"); genuinely different → **before/after diff + explicit opt-in overwrite** (CLI `--force` + InstallModal confirm).
5. Ensure `.mcp.json` is gitignored (it now holds real secrets) — warn/add if missing.

## Scope

### In scope

- **Schema** (`core/schema/index.ts`): optional `inputs[]` on the mcp-server module (name/title/description/secret); document the `${VAR}` placeholder syntax in `config` string values.
- **Scanner** (`agents/flow-install.ts`): deep-scan mcp config string values for `${VAR}`, merge with `inputs[]` metadata → a `requiredInputs` list on the install plan.
- **Secrets store** (`core/`): gitignored read/write helper (e.g. `.insight-flow/secrets.local.json`); a `.gitignore` guard ensuring `.mcp.json` + the secrets file are ignored.
- **Install endpoint** (`dashboard/server/index.ts` `/api/flow-install` + plan): accept submitted `{ values }`; resolve placeholders before `applyArtifacts`; never log secret values in SSE frames.
- **emit** (`agents/emit.ts` `applyMcpServers`): substitute resolved values; compare **resolved** configs; return a structured conflict `{ name, kind, installed, incoming }`; honour an explicit overwrite/`force`.
- **InstallModal** (`dashboard/client/components/InstallModal.tsx`): render input fields (masked for secrets), the before/after diff, and the overwrite confirm.
- **CLI**: `--force` flag + value resolution from the secrets store / env.

### Out of scope

- Idempotent handling of identical command/skill definitions — already shipped in **N164**.
- `${VAR}` in non-mcp module kinds (hook command, prompt text) — design to extend, not in the first cut.
- Undo/rollback of an overwrite (follow-up).
- Relying on Claude Code's native `${VAR}` expansion (rejected — header-field bug #51581).

## Implementation plan

1. **Placeholder + inputs model** — define `${VAR}` syntax; add optional `inputs[]` to the mcp-server schema (Zod).
2. **Scanner → plan** — in `flow-install.ts`, deep-walk each mcp config's string values, collect `${VAR}` names, merge `inputs[]` metadata, expose `requiredInputs` on the install plan.
3. **Secrets store + gitignore guard** — read/write a gitignored secrets file; on install, ensure `.mcp.json` + the store are in `.gitignore` (add/warn).
4. **Endpoint** — `/api/flow-install` accepts `{ values }`; resolve `${VAR}` → value (store/env fallback); pass resolved artifacts to `applyArtifacts`; scrub secrets from SSE/log output.
5. **emit** — `applyMcpServers` substitutes resolved values, compares resolved configs (equal → `unchanged`), emits a structured conflict on a real diff, and writes on `force`.
6. **InstallModal** — collect input values (password inputs for secrets), render the diff on conflict, offer overwrite; never echo secret values.
7. **CLI** — thread `--force` + resolve values from the store/env.

## Verification

- Unit (`node:test`): scanner derives inputs from `${VAR}`; substitution resolves; resolved-equal → `unchanged`; resolved-different → structured conflict; overwrite/force writes.
- Manual in `is-test`: context7 config with `${CONTEXT7_API_KEY}` → an input titled `CONTEXT7_API_KEY` appears → enter key → installs; re-install with the same key → no conflict; change the key → diff + overwrite.
- Security: secret never appears in the committed registry; `.mcp.json` + secrets file are gitignored; secret values absent from SSE frames / CLI output.

## Notes

- Supersedes the original narrow N165 (overwrite/diff only); now owns inputs + substitution + resolved-config comparison + overwrite/diff. The resolved comparison is what actually stops context7 from "still" failing.
- Pairs with **N164** (command/skill idempotency, merged-pending). Conflict sites: `emit.ts:94` (mcp), `:228/:291` (skill/command). UI in `InstallModal.tsx`.
- Source: Claude Code `.mcp.json` expands `${VAR}` in `command/args/env/url` at startup but **not** in `headers` (#51581), and not in plugin roots (#9427) — hence install-time substitution.
