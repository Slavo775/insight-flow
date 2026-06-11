# N92 — Heterogeneous modules — MCP/hook/skill contributions + testing pilot

**Type:** feat
**Priority:** medium
**Created:** 2026-06-11

## Problem

- Modules are text-only (`section` | `include`), but the composer vision's high-value modules are integrations (jira / figma / chrome / testing) that carry MCP-server config, hooks, and skills — not just prompt text (N88 ANALYSIS, Round 4). The schema and emission layer can't express them.

## Goal

1. `AgentModuleSchema` extended with three contribution kinds: `mcp-server` (server name + config object), `hook` (Claude Code settings hook registration), `skill` (skill name + file content).
2. Emission layer with per-kind merge rules: MCP servers deduped by name into the project's `.mcp.json`; hooks merged into `.claude/settings.json` inside marked blocks (`taskflow:hooks` markers, replace-on-reapply); skill files written to `.claude/skills/<name>/SKILL.md`. All writes idempotent with per-file changed/unchanged reporting.
3. One real pilot, end-to-end in the playground: a `testing` integration module contributing a prompt fragment + a hook + a skill, adopted by one composed agent, validated locally (no external credentials).
4. The 9 shipped role files stay byte-stable — drift suite untouched.

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — extend the `AgentModuleSchema` discriminated union with `mcp-server`, `hook`, `skill` kinds (Zod-validated payloads; minimal but not text-overfitted).
- `packages/taskflow/src/agents/compose.ts` — `composeAgent` (MD path) skips non-text kinds; new `collectArtifacts(def)` (or similar) returning the non-text contributions per agent with per-kind dedup/merge metadata.
- New emission module (e.g. `packages/taskflow/src/agents/emit.ts`) — applies artifacts to a project dir: `.mcp.json` (dedup by server name, stable key order), `.claude/settings.json` (marked-block merge), `.claude/skills/<name>/SKILL.md`.
- `packages/taskflow/src/cli/commands/prompt-build.ts` — `--compose --apply` additionally emits artifacts for agents that declare them (or a `--emit <dir>` flag if cleaner); per-file report.
- `packages/taskflow/src/agents/modules/testing.json` — the pilot module (prompt section + hook + skill contributions; a module may need to become multi-contribution or be expressed as a small set of sibling modules — implementer decides per schema design, see ANALYSIS open questions).
- `packages/taskflow/test/compose.test.mjs` (or a new `emit.test.mjs`) — artifact collection, merge rules, idempotency, drift suite untouched.
- Playground — pilot adoption and validation run.

### Out of scope

- Additional integrations (jira / figma / chrome) and any credentials/secret handling.
- Changes to the 9 shipped role files or their composed defs (unless the pilot agent is a playground-only composed def — preferred).
- Dashboard UI (Round 5); registry management UX.
- Wording changes (N91).

## Implementation plan

1. **Schema design first** — decide single-contribution-per-module (sibling modules grouped by id prefix, e.g. `testing/prompt`, `testing/hook`, `testing/skill`) vs multi-contribution records; pick the one that keeps `composeAgent` untouched and validate with Zod; document in code comment.
2. **Artifact collection** (`compose.ts`) — resolve a composed def's non-text contributions in declared order; MD composition ignores them (drift suite proves no regression).
3. **Emission layer** (`emit.ts`) — three writers with merge rules: `.mcp.json` dedup-by-name (error on same-name-different-config), settings hooks in `<!-- taskflow:hooks -->`-style marked JSON keys (replace whole block on reapply), skill files overwrite-if-changed. Idempotent: second run reports all `unchanged`.
4. **CLI wiring** (`prompt-build.ts`) — extend `--compose --apply` to emit artifacts to the project root (reuse `resolveProjectRoot`); per-file changed/unchanged/created lines, same style as N90.
5. **Author the `testing` pilot module** — prompt fragment (e.g. run-the-project's-tests discipline), a PostToolUse-style hook entry (local command, no network), and a small skill file; compose a playground-only agent def adopting it.
6. **Playground validation** — apply in `playground/`, verify `.mcp.json` untouched (pilot has no MCP piece — see ANALYSIS Q2), settings hook block present, skill file created; re-run → all `unchanged`; remove-module → reapply cleans the marked block.
7. **Tests** — unit: schema kinds, collection order, each merge rule, idempotency; drift suite still green.

## Verification

- `pnpm build` + full test suite green, including new emission tests and the untouched 9-role drift suite.
- Playground: apply → artifacts exist; second apply → all `unchanged`; the 9 role MD files unchanged throughout.

## Notes

- Round 4 of the composer line: N88 → N89 → N90 (JSON canonical) → N91 (wording) → **N92** → Round 5 (UI).
- Pilot choice rationale (analyzer + human 2026-06-11): `testing` over `jira` — fully local validation; jira needs creds + live MCP endpoint, deferred to the integration-catalogue work.
- N90 review non-blocking #5 noted the shared text modules should be exercised in this round — the pilot's prompt fragment should reuse one if wording (post-N91) permits.
- Implement after N91 lands (both touch module JSON space; N91 reshapes shared modules).
