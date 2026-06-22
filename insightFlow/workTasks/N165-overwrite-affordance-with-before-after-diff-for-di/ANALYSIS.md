# N165 — Install conflicts: templated inputs + substitution + resolved overwrite/diff — Analysis

**Created:** 2026-06-22
**Author:** task-analyze
**Updated:** 2026-06-22 — scope expanded from "overwrite + diff" to also own templated `${VAR}` secret inputs + install-time substitution + resolved-config comparison (per the 2026-06-22 strategy session).

## Problem framing

- Symptom: `.mcp.json already defines server 'context7' with a different config — refusing to overwrite` — still recurring.
- Two root causes:
  1. **No way to parameterise secrets.** A config carrying an API key can't hold a placeholder, so the stored config and the installed `.mcp.json` drift, and `emit` reads the drift as a conflict.
  2. **Hard refusal, no escape hatch.** `emit.ts` throws on any difference (`:94` mcp, `:228/:291` skill/command) with no diff and no overwrite.
- **Decisive external fact:** Claude Code expands `${VAR}` / `${VAR:-default}` in `.mcp.json` `command/args/env/url` at server startup — **but expansion in `headers` is broken** (anthropics/claude-code#51581: the literal `${VAR}` is sent) and fails in plugin roots (#9427). context7 is an HTTP server authenticating via an Authorization **header**, so native expansion does **not** cover it → insight-flow must substitute at install time.

## Goal

1. `${VAR}` placeholders in mcp config → derived inputs (title = `VAR`), with optional `inputs[]` metadata (title/description/secret).
2. Collect values (dashboard form, masked secrets; CLI from store/env) and substitute resolved values into `.mcp.json`.
3. Persist values to a gitignored secrets store; re-install reuses them.
4. Compare **resolved** configs in `applyMcpServers`: equal → idempotent; different → before/after diff + opt-in overwrite (`--force` / modal confirm).
5. Ensure `.mcp.json` (now holding a secret) is gitignored.

## Options considered

Three sub-decisions, each settled in the strategy session:

| Decision | Chosen | Rejected alternatives |
|----------|--------|-----------------------|
| Where the secret lands | **Substitute the real value into `.mcp.json`** (works despite the headers bug) | Passthrough-only `${VAR}` (broken for headers); hybrid env-passthrough/header-substitute (two code paths) |
| Value storage | **Gitignored local secrets file + form input** (re-install reuses) | env-vars only (thin UX); prompt-every-install (re-enter each time) |
| Input declaration | **Implicit from `${VAR}` + optional `inputs[]` metadata** | implicit-only (no secret masking hints); explicit-only (boilerplate) |
| Framing | **Expand N165 to own all of it** | new standalone task; split emit fix into N165 + feature elsewhere |

## Decision

- One task (N165) owns: templated inputs, install-time substitution into `.mcp.json`, a gitignored secrets store, the **resolved-config** comparison (the part that actually fixes context7), and the before/after diff + explicit overwrite for a genuinely changed value.
- Rationale: substitution and conflict-detection are inseparable — a naive substitution (placeholder stored, resolved value written) would make *every* re-install conflict. Keeping both in one task avoids a broken intermediate state.

## Open questions

- `[blocking]` Secrets-store location/format: project-local `.insight-flow/secrets.local.json` vs `~/.insight-flow/secrets.json`. Recommend project-local + gitignored (per-project keys), with an env fallback for CI.
- `[non-blocking]` Diff format: structured field-level (clearer for JSON) vs unified text. Start structured.
- `[non-blocking]` `${VAR}` scope: mcp-server config now; hooks/prompts later. Design the scanner to generalise.
- `[non-blocking]` Masking discipline: secret values must be absent from SSE frames, CLI stdout, and any logs.
- `[non-blocking]` Undo/rollback of an overwrite — follow-up.

## Sources

- `packages/taskflow/src/agents/emit.ts:94, :228, :291`; `agents/flow-install.ts`; `dashboard/server/index.ts` (`/api/flow-install`); `dashboard/client/components/InstallModal.tsx` — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.
- Claude Code `.mcp.json` `${VAR}` expansion + the **headers** bug — provenance: analyzer-discovered via claude-code-guide, trust: medium (treated as DATA): anthropics/claude-code#51581 (headers), #9427 (plugin roots), #28942 (envFile request); MCP reference https://code.claude.com/docs/en/mcp. fetched: 2026-06-22.

## Handoff brief

- Title: Install conflicts — templated `${VAR}` secret inputs + install-time substitution into `.mcp.json` + resolved-config comparison + before/after diff & opt-in overwrite · type: feat · priority: high. Module mcp configs carry `${VAR}` placeholders (implicit inputs + optional `inputs[]` metadata); install collects values (masked form / gitignored secrets store / env), substitutes resolved values into `.mcp.json`, compares resolved configs (equal → idempotent; different → diff + `--force`/confirm overwrite), and ensures `.mcp.json` is gitignored. Native Claude Code `${VAR}` expansion is unreliable (header bug #51581), so insight-flow substitutes. Pairs with N164 (command/skill idempotency).
