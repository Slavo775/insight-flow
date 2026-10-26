# N271 — Full codebase audit — security, data safety, antipatterns, fragile code → fix tasks

**Type:** chore
**Priority:** high
**Created:** 2026-10-19

## Problem

There has never been a whole-codebase audit for security and correctness. The last one (N253–N256) only looked for dead code and duplication. A first pass on 2026-10-19 (see `AUDIT-SEED.md`) points to serious gaps: the local servers have no CSRF check and listen on all network interfaces, task storage has no lock and no atomic writes, nothing in CI runs the tests, and the slash commands written into user projects leave out the security role files. Those claims come from a different model and are not yet verified. This task produces a verified audit and a set of fix tasks.

## Goal

1. `AUDIT.md` in this folder: every finding has a severity, a category, a file:line, a concrete failure scenario and a fix.
2. Every bullet in `AUDIT-SEED.md` is marked **kept**, **rejected** or **changed**, with a reason and your own file:line evidence.
3. New findings the seed missed are added.
4. A proposed fix-task list (each task sized for one `/task-analyze` → `/task-implement` run, with dependencies and order) is approved by the human.
5. Only after that approval are the fix tasks created via `/taskmaster`.

## Scope

### In scope

- `packages/taskflow/src/` — all of it: `core/`, `cli/`, `dashboard/server/`, `dashboard/client/`, `master/` (server + `client/`), `mcp/`, `agents/` (incl. `init/`, hook scripts, `modules/`).
- `packages/taskflow/templates/`, `packages/taskflow/scripts/`, `packages/taskflow/test/`, `package.json` files, `tsup`/`vite`/`eslint`/`tsconfig` config, the root `pnpm-lock.yaml`.
- `.github/workflows/*.yml`, `RELEASING.md`, root `TASK_*_ROLE.md` / `AGENT_*.md`, `CLAUDE.md` (only for claims that don't match the code).
- Categories: `security`, `antipattern`, `fragile` (works by luck / breaks on edge input, races, platform differences), `enhancement`.
- Threat model: a malicious web page in the user's browser hitting localhost (CSRF, DNS rebinding, CORS); LAN peers; untrusted task content written by AI agents (XSS, prompt injection); untrusted `taskflow.config.json` in a cloned repo; concurrent CLI/hook/dashboard processes writing the same files; prompt-injected agents using the composer MCP.

### Out of scope

- **Any source code change.** This task writes only `AUDIT.md` (and later creates fix tasks). No fixes, not even one-liners.
- `website/` docs content, `playground/` data.
- Style nits and formatting.
- Re-litigating the locked decisions below.

### Locked decisions (put these into the fix tasks; do not ask again)

- State-changing CLI commands **require `--id`**. Read commands (`show`, `current`) keep the current-task fallback.
- Both servers bind **127.0.0.1** by default. LAN stays opt-in via `INSIGHT_FLOW_TRUSTED_HOSTS` (Host-header check, as today). **No pairing token** now — it may be a separate later task.
- Slash commands written into user projects **`@`-include the full role files** (`@.claude/roles/<ROLE>.md` + `$ARGUMENTS`), like this repo's own `.claude/commands/`. The short `SKILL_*` summaries go away.
- Fix tasks that change core storage or the CLI (`src/core/storage*.ts`, `set-status.ts`, `src/cli/cli.ts`, `src/cli/commands/*`) **start only after N267 is merged** (it changes the same files).
- Default (not asked, may be challenged with a reason): restore the 0-byte mp3 files from commit `0d3ff5f` rather than delete the sound feature; per-task `events.json` stays git-tracked.

## Implementation plan

1. **Read the seed.** Read `AUDIT-SEED.md` fully. Treat it as claims, not facts — it is model output (trust: medium). `[V]` items were re-read once by the seed author; still re-check them.
2. **Audit by area.** Go area by area (suggested split: dashboard server · master server + mcp · core + cli · agents/hooks/init · both React clients · CI/build/tests/deps). Read the code; follow calls across modules when a finding depends on them. Parallel read-only subagents per area are fine.
3. **Verify seed claims.** For each seed bullet, confirm or reject with your own file:line. Use small read-only checks where useful (`node -e` for URL/regex/zod behaviour, `git show`, `git ls-files`, `pnpm audit --prod`, `pnpm outdated`). Do not start the servers against the real `insightFlow/` data. Do not write outside this task folder.
4. **Add new findings.** Look especially where the seed is thin: the composer MCP tools, `src/core/chain*.ts` / flow-chain code (N267), `src/agents/compose*` and `modules/`, `scripts/sync-role-templates.mjs`, the published tarball (`npm pack --dry-run --ignore-scripts`).
5. **Write `AUDIT.md`.** Sections:
   - **Summary** — the top 5 risks in plain words.
   - **Findings** — one row/block per finding: `ID (A01…) · severity critical|high|medium|low · category · file:line · issue · scenario · fix · confidence confirmed|plausible · seed ref (T1-3) or "new"`.
   - **Seed verdicts** — a table with every seed bullet: `seed ref · kept|rejected|changed · reason · evidence file:line`.
   - **Looks solid** — what is already done well (so no task is made for it).
   - **Test coverage map** — src area → test files (or NONE).
6. **Propose fix tasks.** Group findings into tasks. Rules: one area or one theme per task; one `/task-analyze` → `/task-implement` run each; list the AUDIT.md IDs each task covers; type/priority/tags; dependencies and order (tasks touching the same files must be sequential); mark which ones wait for N267; write the locked decisions into the tasks they touch. The seed's T1–T14 grouping is a starting point, not a requirement.
7. **Stop and ask.** Show the human the fix-task list (title · type · priority · AUDIT IDs · depends on). **Do not call `/taskmaster` until the human gives an explicit "create it"** (picking options or answering questions is NOT a go-ahead). Change the list if asked.
8. **Create the fix tasks.** After the go-ahead: one `/taskmaster` call per task, each brief citing `N271/AUDIT.md` IDs. Record the created IDs in an `## Created tasks` section at the end of `AUDIT.md`.

## Verification

- `AUDIT.md` exists in this folder and has all five sections from step 5.
- Count check: every bullet in `AUDIT-SEED.md` has exactly one row in **Seed verdicts**.
- Every finding has a file:line that exists in the current tree (spot-check 10 at random).
- `git diff --stat -- packages/ .github/` is empty (no source changes from this task).
- `insight-flow list` shows the fix tasks, and the `## Created tasks` section lists their IDs.

## Notes

- `AUDIT-SEED.md` — the seed findings (Opus 5.5, 2026-10-19). `ANALYSIS.md` — why this task is shaped like this.
- Prior audit: N253–N256 (dead code / dedup / prompt trimming, done). Don't duplicate what they already removed.
- Related open work: N267 (flow chains core + CLI, approved), N268/N269 (chains UI, ready), N270 (2.13.0 release), N242–N244 (debug log engine, pushed). Avoid fix tasks that collide with them, or order them after.
- Known quirks (from project memory): `insight-flow <cmd> --help` *executes* the command — don't use `--help` to explore subcommands, read `src/cli/cli.ts` instead. `insight-flow show Nxx` without `--id` silently shows the current task — always pass `--id`.
- Per-task `events.json` files get rewritten by hooks during the session — expect them dirty in `git status`; that is not your change.
