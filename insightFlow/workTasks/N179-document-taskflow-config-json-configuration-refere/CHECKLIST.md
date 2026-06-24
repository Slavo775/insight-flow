# N179 — Document taskflow.config.json configuration reference (docs site) — Checklist

## Done criteria

- [ ] `website/docs/configuration.md` exists with valid frontmatter and `sidebar_position`.
- [ ] Page uses the correct filename `taskflow.config.json` throughout (never `insightFlow.config.json`).
- [ ] Every config area documented: top-level keys, `server`, `activityEngine`, `notifications`, `master`, `observability.langfuse`, `events`, `flows`, `agents` (incl. all `git.permissions` flags).
- [ ] Each key has type, default, and what-it-controls; non-obvious keys have an "effect of changing" note.
- [ ] ⚠️ `:::warning` callouts present for `workDir`, `shardSize`, `agents.git.permissions.remoteOps`.
- [ ] "Adjacent configuration" section covers `~/.insight-flow/` files, env vars (LANGFUSE_*, INSIGHT_FLOW_NO_OPEN, CLAUDE_SESSION_ID), ports 6006/6100.
- [ ] Source-of-truth note links `src/core/config.ts` + `src/core/types.ts`.
- [ ] Complete sample `taskflow.config.json` block with every key populated.
- [ ] Cross-links to `cli/config-and-migration.md` and `reference/AGENT_CONFIG.md` (no duplication of git-permissions runtime protocol).
- [ ] CLI flags NOT documented here (linked out instead).
- [ ] No file added/edited under `website/docs/reference/`.

## Quality gates

- [ ] `pnpm --dir website build` passes with no broken-link warnings for the new page.
- [ ] Documented defaults match `src/core/config.ts` (spot-check ≥3 keys).
- [ ] `sync-docs.mjs` still runs clean (reference/ untouched).

## Verification

- [ ] Run `pnpm --dir website build` (or `start`) → page renders, appears in sidebar, admonitions + tables + sample block display correctly.
