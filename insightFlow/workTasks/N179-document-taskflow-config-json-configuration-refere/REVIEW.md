# N179 — Document taskflow.config.json configuration reference (docs site) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-24
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Single net-new docs page (`website/docs/configuration.md`, +379 lines, no other
files touched) documenting every `taskflow.config.json` key by area with type,
default, what-it-controls, and effect-of-change, plus an adjacent-config section
(global `~/.insight-flow/`, env vars, ports) and a complete sample config.
Documentation-only change — risk is factual accuracy and build health, both of
which I verified against source. Approving.

## Checklist verification

- [x] `configuration.md` exists with valid frontmatter + `sidebar_position` (2.5) — pass
- [x] Correct filename `taskflow.config.json` throughout; the only mentions of `insightFlow.config.json` are the explicit "there is no such file" note (L23–26) — pass
- [x] Every area documented: top-level, `server`, `activityEngine`, `notifications`, `master`, `observability.langfuse`, `events`, `flows`, `agents` (incl. all 10 `git.permissions` flags) — pass
- [x] Each key has type/default/controls; non-obvious keys carry effect-of-change prose — pass; spot-checked defaults against `config.ts` (workDir `"workTasks"`, shardSize `10`, server.port `6006`, activityEngine.maxEvents `200`, forcePush `false`) — all match
- [x] ⚠️ `:::warning` callouts for `workDir` (L57), `shardSize` (L68), `remoteOps` (L240) — pass; `remoteOps` deny-semantics example matches `config.ts:72–79`
- [x] Adjacent section covers `~/.insight-flow/` files, env vars, ports 6006/6100 — pass; `CLAUDE_SESSION_ID` matches `log-event.ts:72`, `INSIGHT_FLOW_NO_OPEN==="1"` matches `index.ts:1517`
- [x] Source-of-truth note links `config.ts` + `types.ts` (L16–21) — pass
- [x] Complete sample `taskflow.config.json` with every key (L296–372) — pass
- [x] Cross-links to `cli/config-and-migration.md` + `reference/AGENT_CONFIG.md`, git-perms runtime protocol not duplicated (delegated to AGENT_CONFIG) — pass
- [x] CLI flags not documented here; linked out to `cli/` (L28–30) — pass
- [x] No file added/edited under `website/docs/reference/` (`sync-docs`: 0 written / 0 pruned) — pass

## Quality gates

- [x] `pnpm --dir website build` — pass, **zero** warnings (Docusaurus throws on broken links; clean ⇒ all internal links + anchors resolve)
- [x] `sync-docs.mjs` clean, `reference/` untouched — pass
- [x] `prettier --check` — pass
- [x] Langfuse credential precedence documented as config-first/env-fallback — matches `langfuse.ts:182–189`

## Non-blocking

1. **`master.*` "default" cells are effective-runtime defaults, not config-applied
   defaults.** `config.ts` `DEFAULTS` has no `master` block, so the project config
   `master` object is spread as-is; the `6100` / `false` values come from runtime
   fallbacks (`index.ts`) and the master-server config (`master/config.ts:12`).
   Documenting them as "default" is correct *behaviorally* and is the right call
   for a user-facing reference — just noting the nuance for a future maintainer.
   No change required.
2. `sidebar_position: 2.5` (float) is intentional — slots the page between Getting
   Started (2) and the CLI category (3) without renumbering category positions.
   Valid in Docusaurus; flagging only because it's an unusual value.

## Notes

- No PR yet (`branch`/`mrUrl` null) and no `agents.extend.task-review` command
  configured → reviewed the local working tree; REVIEW.md is the review surface.
- Follow-on to N178. Next: `/task-git` to branch + push (page already builds clean).


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-24
**Verdict:** approved

> "done great merge it"

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

Approved for merge. Handing off to `/task-git` to branch, push, open PR, and merge.
