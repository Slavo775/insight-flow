# N270 — Release insight-flow 2.13.0 — flow chains (N267)

**Type:** chore
**Priority:** high
**Created:** 2026-10-19

## Problem

Release flow chains (N267) as **insight-flow 2.13.0**. The feature is on branch `feat/N267-flow-chains` (PR **#174**, open, AI review approved, 4 commits on top of `v2.12.0`). The release check (2026-10-19) found tests green and the intent clear, but **the Docusaurus docs and README have gaps** for the new commands and concepts, so the release needs a docs pass before merging.

## Release readiness (from task-release-check)

**Verdict: NOT ready — docs gaps only. No code or test blockers.**

- **Tests: PASS.** `pnpm run typecheck` clean; `pnpm test` **391/391** (load avg ~5).
- **Intent: feature → 2.13.0 (minor).** Commits: `feat(flows)` + `fix(flows)` + 2 × `chore(tracker)`; no `!` / `BREAKING CHANGE`. All schema changes are optional fields or new kinds; the public barrel only grows; existing CLI commands behave the same for tasks without a chain. Small behaviour changes for existing users: the composer MCP now caps create/update bodies at 256 KB (same as HTTP); MCP `get` of a prototype-key id (`constructor`) now says "unknown"; the authoring prompts mention chains (after re-install); one new AGENT_PROTOCOL rule, inert without chains. **Downgrade note:** a ≤2.12.0 binary that rewrites a shard drops `chainId` and history `flowId` (non-strict schema strips unknown keys).
- **Docs: NOT complete.** See the checklist "Docs gaps" — one wrong statement, several pages that list all commands / explain concepts were not updated. CHANGELOG is release-please managed (entry is created on the release PR) — no manual edit.

## Goal

1. Close every docs gap from the release check (Docusaurus + README + CLI help text), on the feature branch `feat/N267-flow-chains` so they ship in PR #174.
2. Re-run the release check → `ready-to-release`.
3. Merge PR #174 into `main` (squash; title `feat(flows): …` keeps the minor bump) → release-please opens the 2.13.0 release PR.
4. Merge the release PR (human-approved) → tag `v2.13.0` + npm publish (npm-publish env approval).
5. Roll out: reinstall the global binary; record N267 merged + done on `main`.

## Scope

### In scope

- Docs only: `website/docs/**`, `packages/taskflow/README.md`, the `chain-advance` line of the CLI help in `packages/taskflow/src/cli/cli.ts` (text only), optionally root `CLAUDE.md` subcommand list.
- The release steps (merge PR #174, release PR, publish, rollout).

### Out of scope

- Code behaviour changes. In particular the "next command after a chain into `default`" design point (see Notes) — a decision for the human, not a release fix.
- CHANGELOG edits (release-please writes it).
- Dashboard chains UI (N268, N269).

## Implementation plan

1. **Fix the wrong statement** — `website/docs/cli/git-and-flow.md` (~line 66): the hint is printed by lifecycle commands (`merge`, `done`, `advance`, `review-end`, `implement-*`, `fix-*`, `change-*`, `push`), not by the raw `status` override. Also fix the stray leading space (~line 72) and add `set-chain` to the "commands you run yourself" note (~line 14).
2. **Command lists** — `website/docs/cli/index.md` line 42: add `set-chain`, `chain-advance`. `website/docs/cli/tasks-and-query.md` (~line 22): add `--chain <chainId>` to `create` (starts in `flows[0]`; `--flow` must be in the chain).
3. **CLI help + README flags** — `packages/taskflow/src/cli/cli.ts` (~line 138) and `packages/taskflow/README.md` (~line 209): `chain-advance --id Nxx [--to <flowId>] [--by <agent>]`. `set-chain` rows (`git-and-flow.md` ~line 33, README ~line 208): "if the task's flow is not in the chain, it moves to the chain's first flow".
4. **Concepts** — `website/docs/concepts/handover.md`: add a "Chain handovers (flow → flow)" section (third kind; resolved at run time from the `chain next:` line + the AGENT_PROTOCOL rule; link `../cli/git-and-flow.md#chains-flow--flow`). `website/docs/concepts/flows.md` + `concepts/index.md` (~47–59): one paragraph on chain binding (`--flow` > `chain.flows[0]` > byType/default; `chain-advance` changes `flowId`) and the new `Task.chainId` / `statusHistory[].flowId` fields. `website/docs/flow/statuses.md` ("Terminal vs. active"): a chain can link a terminal to the next flow.
5. **Authoring docs** — `website/docs/authoring/index.md` (line 22) and `authoring/walkthrough.md` (line 19): intent includes "a chain of flows". `authoring/agents-and-subagents.md` (line 64): relationship = "handovers + flow edges + flow chains". `composer-mcp/index.md` (line 78): "modules/agents/flows/chains".
6. **Composer MCP tools page** — `website/docs/composer-mcp/tools.md`: chain `title` ≤200, `description` ≤2000; `flows` ≥1; link `from`/`to` must be in `flows`; duplicate links rejected; `custom:` ids only; chain entries in `list`/`get` have `flows`/`linkCount`, no `installed`/`locked`; link anchor `#chains-flow--flow`.
7. **Guides + README composer section** — `website/docs/guides/custom-flow.md` (~89–93): a chained task can only move to a flow of its chain. `website/docs/guides/troubleshooting.md`: entry for a broken chain file (every chain command fails / warns; `GET /api/chains` returns `userSpaceError`; fix or delete the file — `DELETE /api/chains/<id>` works on a broken file). README "Composer MCP" (~line 668): add chain + `describe`.
8. **Gates + commit** — docs build (`pnpm --dir website build` if available) or at least link check; `pnpm --dir packages/taskflow run typecheck` (cli.ts text change); commit `docs(flows): …` on `feat/N267-flow-chains`, push.

## Verification

- `grep -rn "set-chain\|chain-advance" website/docs/cli/index.md` and `grep -n -- "--chain" website/docs/cli/tasks-and-query.md` → found.
- `grep -n "status command prints" website/docs/cli/git-and-flow.md` → nothing.
- `node packages/taskflow/dist/cli.js help | grep chain-advance` shows `[--by <agent>]` after a build.
- Release check re-run → docs auditor reports complete → `ready-to-release`.
- After publish: `npm view insight-flow version` → `2.13.0`; tag `v2.13.0` exists.

## Notes

- Feature PR: **#174** (`feat/N267-flow-chains`). Release is driven by release-please (`release-please-config.json`, node, `packages/taskflow`); merging #174 to `main` makes it open the 2.13.0 release PR; merging that tags + triggers npm publish (npm-publish environment needs approval — see the release-publish workflow).
- **Decision needed (not a release blocker):** a chain link into the `default` flow prints "then `/task-analyze`" — the first of `default`'s `entryAgents` (`["task-analyze", "taskmaster"]`). For a task that already has a spec, `/task-implement` is likely the right next step. Options: document it, add an optional `entry` field on a chain link, or pick a better default. Ask the human; do not change code in this release task.
- Tracker bookkeeping: the release check briefly set N267 itself to `release-checked`; this task (N270) now carries the release state and N267 is back to `approved`.
- After publish, reinstall the global binary (`pnpm pack:taskflow && npm i -g packages/taskflow/insight-flow-*.tgz`) so agents and the composer MCP see `set-chain`, `chain-advance`, `create_chain`.
- Related: N267 (feature), N268 (Chains page), N269 (task-detail chain bar).
