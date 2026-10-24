# N270 — Release insight-flow 2.13.0 — flow chains (N267) — Checklist

## Done criteria

### Docs gaps (from the release check — each must be closed)

- [x] `cli/git-and-flow.md`: the hint is printed by lifecycle commands, not the raw `status` override; fix stray leading space (~l.72); add `set-chain` to the "run yourself" note (~l.14)
- [x] `cli/index.md` l.42: Git & Flow row lists `set-chain`, `chain-advance`
- [x] `cli/tasks-and-query.md`: `create --chain <chainId>` flag documented
- [x] CLI help (`src/cli/cli.ts` ~l.138) + README l.209: `chain-advance … [--by <agent>]`
- [x] `set-chain` re-seat behaviour documented (`git-and-flow.md` ~l.33, README ~l.208)
- [x] `concepts/handover.md`: "Chain handovers (flow → flow)" section (third kind)
- [x] `concepts/flows.md` + `concepts/index.md`: chain binding order + `Task.chainId` / `statusHistory[].flowId`
- [x] Authoring docs name chains: `authoring/index.md` l.22, `authoring/walkthrough.md` l.19, `authoring/agents-and-subagents.md` l.64, `composer-mcp/index.md` l.78
- [x] `composer-mcp/tools.md`: chain limits/rules, chain fields in `list`/`get`, `#chains-flow--flow` anchor
- [x] `flow/statuses.md` "Terminal vs. active": chain links start at a terminal
- [x] `guides/custom-flow.md` ~l.89–93: chained task stays in its chain
- [x] `guides/troubleshooting.md`: broken chain file entry
- [x] README "Composer MCP" (~l.668): chain kind + `describe`
- [x] (optional) root `CLAUDE.md` subcommand list: `set-chain`, `chain-advance` (also `advance`, `set-flow`)
- [x] Extra: `composer-mcp/index.md` registry sentence and the `mcp` CLI help line mention chains

### Docs gaps — re-check 2 (each must be closed)

- [x] `cli/git-and-flow.md` Example block (~l.82–90): put the chain commands in their own block; `chain-advance` runs while the task is at `merged` (before `done`); `create` makes a new id, not N42
- [x] `guides/troubleshooting.md` (~l.153–154): `set-chain <chainId>` and `chain-advance` fail, but `set-chain --chain none` still works (the recovery step `set-flow` suggests)
- [x] `guides/troubleshooting.md` heading / first bullet (~l.148): name both error texts — `Cannot load chains: …` (`create --chain`) and `Invalid user-space definition <file>: …` (`set-chain`, `chain-advance`, MCP `list`/`get`)
- [x] `guides/troubleshooting.md` (~l.164–166): deleting a broken chain by id works only if the file is named after the id (`insightFlow/chains/<id without custom:>.json`); otherwise delete the file by hand
- [x] `dashboard/views.md` (~l.66–68) + `flow/index.md` (~l.15–17): a chained task can only move to a flow of its chain
- [x] `flow/statuses.md` (~l.47–49): the task moves only when `chain-advance` runs (a `gated` link waits for a human) — not automatically
- [x] `composer-mcp/index.md` (~l.21–23): chains have no install step
- [x] (optional nits) troubleshooting: the broken-chain warning prints on every status write of a chained task; `authoring/index.md` intro (~l.8–11, 19) names chains; `concepts/index.md` l.47 "one flow at a time"; README l.208 "a task whose flow is not in the chain moves…"

### Docs gaps — audit fixes (N271–N284), combined-scope re-check (2026-10-24)

**BLOCKER — `trust-hooks` undocumented + `events.hooks` docs describe pre-N274 behaviour.** Configured `events.hooks` shell commands no longer run on `insight-flow log-event` until the human approves the exact hook set via `insight-flow trust-hooks --yes`; the docs still tell users to configure hooks with no mention of the gate, so their hooks silently never fire. Close all four:

- [x] `website/docs/configuration.md` (~l.163-166): the `events.hooks` row/prose must state the commands require `insight-flow trust-hooks` approval first, and re-approval when the hook set changes
- [x] `packages/taskflow/README.md`: fix the `events.hooks` description + example (~l.619-637) to note the trust gate; add `trust-hooks` to the command-reference block (~l.170-228)
- [x] `website/docs/cli/events-and-hooks.md`: add `trust-hooks` to the Hooks table and document the gate alongside `events.hooks` (new "## Trusting `events.hooks`" section)
- [x] `website/docs/cli/index.md` (~l.45): add `trust-hooks` to the Events & Hooks command summary

**NICE-TO-HAVE — composer MCP `install` confirm gate is stale:**

- [x] `website/docs/composer-mcp/tools.md` (~l.92): document the two-step signature — hook / mcp-server targets return `{ needsConfirm, plan }` and write nothing unless re-called with `confirm:true` (verified against composer.ts; include.ref/uninstall claims omitted as unverified)

### Release notes — behaviour changes (upgrade notes, required)

- [x] Draft an "Upgrade notes / behaviour changes" section covering: trust-hooks gate (N274); config path confinement + required http(s) `master.url` (N274); built-in override may not drop the locked baseline (N273); composer `install` two-step confirm (N273); dashboard body cap by bytes + JSON 404 on unknown `/api/*` (N284); `mr-update` http(s)-only (N274); `master` exits non-zero on a busy port (N282); versioned hub service-worker cache (N282) — drafted in TASK.md "Release notes (draft)"
- [ ] Human sign-off: do the three "previously-valid config now fails" items (trust-hooks gate, config confinement, override-baseline refusal) warrant a MAJOR? (by commit markers → no; ship **2.13.0**)

### Docs gaps — re-check 4 (combined branch @ `ed7c116`)

**Blockers (each must be closed):**

- [x] B1 — Release notes (TASK.md): add the N272 trust boundary — dashboard + hub bind `127.0.0.1` unless `INSIGHT_FLOW_TRUSTED_HOSTS` is set; CORS `*` removed; untrusted Host → `421`, cross-site write → `403`; dashboard `/api/config` + `/api/activity` removed
- [x] B2 — `built-ins/master-server.md`: fix the security model (l.267, l.275-287, endpoints table l.327-340, phone claim l.306-307) + the same phone/`insight-flow ui` gap in `guides/multi-project-master.md` (~l.102-110)
- [x] B3 — `composer-mcp/index.md` l.93: drop "no per-call human gate"; Safety list adds the install confirm step, `delete` refusing an installed definition, and the override baseline rule
- [x] B4 — Langfuse host (N274): config `host` is used only when both keys also come from config — fix `configuration.md` (~l.145-152, l.289), `guides/observability.md` (~l.36-43), README (~l.377, l.390); add a release-notes bullet

**Non-blocking (close what is verifiable; leave a note for any skipped):**

- [x] N1 — Release notes accuracy: baseline-dropping override also fails to *load*; `include.ref` must be a plain `*.md` filename; N275 re-run `init` (stubs upgraded, customised kept + listed, Cursor skills need `init --force`); name the confined keys + symlinks
- [x] N2 — Config reference states the new rejects (`configuration.md` ~l.38, 41, 94, 127; README ~l.343, 346, 356, 609)
- [x] N3 — Install examples that now return `needsConfirm` (`composer-mcp/tools.md` ~l.126-128, `composer-mcp/index.md` ~l.68, `authoring/index.md` ~l.94)
- [x] N4 — `composer-mcp/tools.md`: `delete` refuses an installed def; `uninstall` returns `installed: false` when nothing was installed; `update_*` baseline rule
- [x] N5 — `include.ref` rule in `concepts/modules.md` (~l.29, 49) + `guides/custom-module.md` (~l.21)
- [x] N6 — `cli/events-and-hooks.md`: approval is per user (`~/.insight-flow/trusted-hooks.json`) — each teammate / CI machine approves; moving the folder clears it
- [x] N7 — CLI help `cli.ts` ~l.162: `trust-hooks [--yes] [--force]`
- [x] N8 — `cli/git-and-flow.md` l.23: `mr-update --url` accepts only http(s)
- [x] N9 — `configuration.md` env-var table: add `INSIGHT_FLOW_TRUSTED_HOSTS`
- [x] N10 — Root `CLAUDE.md`: add `trust-hooks`; drop the removed `/api/activity`
- [x] N11 — `guides/cursor.md` ~l.41: existing skills need `init --force` to pick up the new ones
- [x] N12 — `master-server.md`: busy port → `[hub] port N is already in use`, exit 1; service-worker cache `if-hub-<version>`, old caches removed
- [x] N13 — Remote master (README ~l.958-969, `configuration.md` ~l.132-133): a remote hub cannot register projects
- [x] N14 — (optional) troubleshooting: "events.hooks don't run", "421 / can't reach the dashboard from another device", "config error: … must stay inside the project"

### Docs gaps — re-check 5 (`bf4af8e`)

- [x] G1 (blocker) — `packages/taskflow/README.md` ~l.667: drop "Tools run autonomously"; `install` of a hook / MCP-server target returns `{ needsConfirm, plan }` and writes nothing until re-called with `confirm: true`
- [x] G2 — Release notes: only the dashboard answers `421` for an untrusted Host; the hub answers `403` on its guarded routes
- [x] G6 — Release notes + docs: markdown views drop `<img>` and HTML responses carry a CSP (`img-src 'self' data:`), so images in task docs no longer show; install gitignores `.mcp.json` when a secret is substituted into an MCP config (warns if tracked) and the MCP `install` result may carry `warnings` (`composer-mcp/tools.md`, `guides/install-engine.md`)
- [x] R1 — Release notes: a path-style `include.ref` also stops the whole user space from loading (same effect as the baseline override)
- [x] G3 — `built-ins/master-server.md` endpoints table: "top-level navigation **to a trusted Host**"
- [x] G4 — `guides/cursor.md`: `--force` overwrites role files only when Claude is also scaffolded
- [x] G5 — README ~l.56: re-running `init` upgrades insight-flow's own old command stubs and lists customised files it kept
- [x] G7 — Phone setup (`multi-project-master.md`, `master-server.md`, `troubleshooting.md`): stop an already-running hub first, else the env var has no effect
- [x] G8 — `composer-mcp/tools.md` `uninstall`: `installed: true` means the target was installed (artifacts removed or retained)
- [x] G9 — README Events: hook approval is per user
- [x] G10 — Root `README.md` ~l.250: mention the install confirm step

### Decision (human) — re-check 4

- [ ] Version: 2.13.0 (recommended, with "action required" notes) or 3.0.0 (`events.hooks` + Langfuse host fail silently)
- [ ] N266 rides in this release with a pushed-but-not-re-reviewed fix — re-review first, or accept

### Release steps

- [x] Docs commit pushed to `feat/N267-flow-chains` (PR #174)
- [x] Audit-fix docs (trust-hooks + composer install) committed to `chore/N271-audit-fixes` (PR #175) — `ed7c116`
- [ ] Release check re-run → docs complete → `ready-to-release`
- [ ] PR #174 merged to `main` (squash, `feat(flows): …` title) → release-please opens the 2.13.0 release PR
- [ ] Release PR merged (human-approved) → tag `v2.13.0`, npm publish approved + succeeded
- [ ] Rollout: global binary reinstalled; N267 recorded `merged` + `done` on `main`

### Decision (human)

- [ ] Next command after a chain into `default` (`/task-analyze` today) — decided; follow-up task created if code changes

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes (cli.ts help text)
- [x] `pnpm --dir packages/taskflow test` passes (391/391 at check time; since then only two help-text lines changed — no test pins them; e2e-smoke + published-surface + flow-chains 22/22)
- [x] Docs build / link check passes — `pnpm --dir website build` OK, no broken-link/anchor warnings
- [x] No code behaviour changes in this task (help text only)

## Verification

- [ ] Docs auditor re-run reports "complete for release"
- [ ] `npm view insight-flow version` → `2.13.0`; tag `v2.13.0` present
