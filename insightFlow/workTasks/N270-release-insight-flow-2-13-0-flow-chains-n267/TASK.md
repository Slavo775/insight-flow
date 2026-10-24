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

### Re-check (2026-10-19, after docs commit `85a779f`)

**Verdict: NOT ready — small docs fixes only.** Tests **391/391**, typecheck clean, `pnpm --dir website build` OK with no link/anchor warnings. Intent unchanged: feature → **2.13.0**, no breaking change (`85a779f` changes only help text in code). All 13 first-round docs gaps are closed. The re-audit found factual slips in the new and existing text — listed in CHECKLIST "Docs gaps — re-check 2". The worst: the CLI example runs `chain-advance` after `done`, where the example chain has no link, so the command fails.

### Re-check 3 (2026-10-24 — combined scope: + audit fixes N271–N284)

**Verdict: NOT ready — one docs blocker (audit fixes); no code or test blockers.** Human confirmed the scope: 2.13.0 now ships flow-chains (N267) **and** the audit security/reliability fixes (N271–N284) together, from branch `chore/N271-audit-fixes` (PR **#175**, stacked on `feat/N267-flow-chains` / PR #174). Re-check on the combined branch:

- **Tests: PASS.** Build + typecheck clean, **430/430** pass, no flakes.
- **Intent: feature → 2.13.0 (minor).** Still minor — the only `feat` is flow-chains; all 14 audit fixes are `fix`, no `!` / `BREAKING CHANGE`. But the audit fixes add user-observable behaviour changes that need an "upgrade notes" section (see CHECKLIST "Release notes — behaviour changes"), and a human call on whether the three "previously-valid config now fails" items (trust-hooks gate, config confinement, override-baseline refusal) warrant a major — strictly by the commit markers they do not.
- **Docs: NOT complete — 1 blocker + 1 nice-to-have (audit fixes).** Flow-chains docs stay complete (re-check 2 example confirmed fixed); LAN/trust-hosts/127.0.0.1/X-Forwarded-Host docs complete. New gaps: `insight-flow trust-hooks` is undocumented and the `events.hooks` docs describe pre-N274 behaviour; the composer MCP `install` confirm-gate signature is stale. See CHECKLIST "Docs gaps — audit fixes".

### Re-check 4 (2026-10-24 — combined branch `chore/N271-audit-fixes` @ `ed7c116`)

**Verdict: NOT ready — 4 docs blockers; no code or test blockers.** The range also carries N266 (authoring prompt cookbook, `6b59d3c` + fix `30277e0`) through the stack.

- **Tests: PASS.** Build, typecheck, lint (0 errors, 2 unused-disable warnings in `FlowEditor.tsx`) clean; **430/430**; HEAD unchanged during the run.
- **Intent: feature → 2.13.0.** No `!` / `BREAKING CHANGE`. Two documented setups now fail **silently** — `events.hooks` (trust gate) and a config-set Langfuse `host` — so strict SemVer would say major; the intent detector recommends 2.13.0 (every change is a security fix with a one-step way back) with loud "action required" upgrade notes. Human call (CHECKLIST "Decision").
- **Docs: NOT complete — 4 blockers + ~14 non-blocking.** The earlier "LAN/trust-hosts docs complete" claim was wrong: the N272 trust boundary (loopback bind, `INSIGHT_FLOW_TRUSTED_HOSTS`, CORS removed, 421/403, `/api/config` + `/api/activity` removed) is missing from the release notes and `master-server.md`; the composer MCP page still says "no per-call human gate"; the Langfuse host change is undocumented. Earlier gaps stay closed; flow-chains and N266 docs are correct. See CHECKLIST "Docs gaps — re-check 4".
- **N266 review state:** last verdict `fix-needed`; the fix (`30277e0`) was pushed but never re-reviewed, and N266 has no PR of its own. Human call.
- **Merge hints (for task-release-merge):** before retargeting #175 to `main`, `git rebase --onto origin/main a4c0eaa chore/N271-audit-fixes` (else all 26 commits reappear and tracker shards may conflict). After merge, add a release-please `BEGIN_COMMIT_OVERRIDE` block to #175 so the changelog lists trust-hooks, the install confirm, the Langfuse change and N266 separately instead of one "Bug Fixes" line.

## Goal

1. Close every docs gap from the release check (Docusaurus + README + CLI help text), on the feature branch `feat/N267-flow-chains` so they ship in PR #174.
2. Re-run the release check → `ready-to-release`.
3. Merge PR #174 into `main` (squash; title `feat(flows): …` keeps the minor bump) → release-please opens the 2.13.0 release PR.
4. Merge the release PR (human-approved) → tag `v2.13.0` + npm publish (npm-publish env approval).
5. Roll out: reinstall the global binary; record N267 merged + done on `main`.

**Combined scope (2026-10-24):** the audit-fix docs gaps (trust-hooks + composer install) are fixed on `chore/N271-audit-fixes` (PR #175) so they ship with the fixes; flow-chains docs already shipped on PR #174. Merge order follows the stack — #174 to `main` first, then retarget #175 to `main` — before the release-please 2.13.0 PR is cut. The merge agent owns that sequencing.

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

## Release notes (draft — for the 2.13.0 release PR body, from task-release-fix 2026-10-24)

### Upgrade notes / behaviour changes

**Action required** — these can stop a working setup (the first three fail silently):

- **`events.hooks` now require approval.** Configured hook commands no longer run automatically — review and approve them per project with `insight-flow trust-hooks --yes`. Any edit to the hook set invalidates approval and must be re-approved; until then the commands are skipped and a stderr notice is printed. Approval is stored per user (`~/.insight-flow/trusted-hooks.json`) and keyed by the project's absolute path, so each teammate and each CI machine approves once, and moving the project folder clears it.
- **Langfuse: a config `host` is used only with config keys.** `observability.langfuse.host` from `taskflow.config.json` is now honoured only when both `publicKey` and `secretKey` also come from the config. With keys in env, the host comes from `LANGFUSE_HOST` (or `LANGFUSE_BASEURL`), else the SDK default — so a self-hosted setup with keys in env must set `LANGFUSE_HOST`, or traces go to Langfuse cloud.
- **The dashboard and the hub listen on `127.0.0.1` only.** Before, they listened on all interfaces and sent `Access-Control-Allow-Origin: *`. Now LAN / phone access (for the hub **and** a per-project dashboard) needs `INSIGHT_FLOW_TRUSTED_HOSTS` (comma-separated host or `host:port`), which also restores the all-interfaces bind. An untrusted `Host` gets `421`, a cross-site write gets `403`, and CORS `*` is gone, so cross-origin browser clients stop working. The dashboard endpoints `/api/config` (it leaked secrets) and `/api/activity` (activity arrives in the SSE snapshot) are removed.
- **Config paths are confined to the project root and `master.url` must be `http(s)`.** `workDir`, `rolesDir` and `activityEngine.logFile` must resolve inside the project — an absolute path, `../`, or a symlink pointing outside is rejected. Off-root paths or a non-`http(s)` `master.url` now abort every command and `insight-flow init` with a clean error instead of being silently accepted.
- **A built-in agent override can no longer drop the locked baseline.** An override that would strip the locked security / enforcement / protocol modules is refused at write time, and an existing override file that already drops them now fails to load (which stops the whole user space from loading until it is fixed).
- **`include.ref` must be a plain `*.md` filename.** A module whose `include` ref has a path (e.g. `docs/x.md` or `../x.md`) now fails validation.
- **Re-run `insight-flow init` to get full role prompts in the Claude commands.** Old stub commands that insight-flow wrote are upgraded automatically; commands you customised are kept and listed. Existing Cursor skills are replaced only with `init --force` (which also overwrites edited role files).

**Other changes:**

- **Composer `install` is now two-step for executable targets.** A target that emits a hook or MCP server returns `{ needsConfirm: true, … }` and writes nothing until you re-call with `confirm: true` after a human has seen the plan. `install` also fails when required `${VAR}` inputs are missing, and `delete` refuses a definition that is still installed.
- **Dashboard hardening.** Request bodies are now capped by byte size, and an unknown `/api/*` route returns a JSON `404` (previously it served the `200` SPA shell).
- **`mr-update` accepts only `http(s)` URLs.** Other schemes are rejected.
- **`insight-flow master` exits non-zero on a busy port** instead of appearing to start.
- **The hub service-worker cache is version-stamped**, so a release invalidates the previously cached asset rather than serving a stale one.

> Human sign-off still open: whether the "action required" items — above all the two silent ones (`events.hooks`, Langfuse host) — warrant a **major**. By the commit markers they do not → ship as **2.13.0** (recommended by the intent check, with this section in the release notes).

## Notes

- **Found during re-check 4 fixes, left alone (older docs/code slips, not caused by this release):** composer MCP refuses **every** built-in flow on `update`, but `composer-mcp/index.md` + `tools.md` name only `default` (`composer.ts:219`); `concepts/modules.md` says "eight kinds" but lists nine; `guides/custom-module.md` kinds table lacks `subagent`; README / `configuration.md` describe `master.standalone` wrongly (it disables master integration, `dashboard/server/index.ts:632`) and give `startMasterLocally` the wrong default (effectively `true`, `:636`); `master-server.md` endpoints table lacks `POST /log`, `GET /api/logs`, `/logs`, `/assets/*`; code comment `master/server.ts:230-231` lists only `/p/*` as never cached. Lint: 2 unused `eslint-disable` in `FlowEditor.tsx`. The authoring install prompt never mentions `needsConfirm` (prompt change → own task). Each needs a normal task — ask the human before creating any.

- **Follow-up (outside this release):** the authoring install agent prompt (`packages/taskflow/src/agents/modules/roles/authoring.json`, `authoring-install/identity` + `composer-install-checklist`) says it installs "flows, agents, and modules" and never says a chain needs no install step; an authored chain could reach `install({kind:"chain"})`, which the MCP rejects. Prompt change → needs its own task on the default flow (ask the human before creating it).

- Feature PR: **#174** (`feat/N267-flow-chains`). Release is driven by release-please (`release-please-config.json`, node, `packages/taskflow`); merging #174 to `main` makes it open the 2.13.0 release PR; merging that tags + triggers npm publish (npm-publish environment needs approval — see the release-publish workflow).
- **Decision needed (not a release blocker):** a chain link into the `default` flow prints "then `/task-analyze`" — the first of `default`'s `entryAgents` (`["task-analyze", "taskmaster"]`). For a task that already has a spec, `/task-implement` is likely the right next step. Options: document it, add an optional `entry` field on a chain link, or pick a better default. Ask the human; do not change code in this release task.
- Tracker bookkeeping: the release check briefly set N267 itself to `release-checked`; this task (N270) now carries the release state and N267 is back to `approved`.
- After publish, reinstall the global binary (`pnpm pack:taskflow && npm i -g packages/taskflow/insight-flow-*.tgz`) so agents and the composer MCP see `set-chain`, `chain-advance`, `create_chain`.
- Related: N267 (feature), N268 (Chains page), N269 (task-detail chain bar).
