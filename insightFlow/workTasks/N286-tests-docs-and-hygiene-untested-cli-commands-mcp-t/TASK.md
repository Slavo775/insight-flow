# N286 — Tests, docs and hygiene — untested CLI commands, MCP tool tests, test-port isolation, doc drift

**Type:** chore
**Priority:** low
**Created:** 2026-10-19

## Problem

Several CLI commands are never executed by any test: `incident-*`, `change-*`, `next-change`, `mr-update`, `migrate-hooks` and `update` are only checked by name. Most composer MCP tools are tested only indirectly.

The test suite only works serially. Fixed ports and overlapping random port ranges collide, `SIGKILL` in teardown isn't awaited, 16 calls use a 500 ms timeout against a ~380 ms cold start, and `test:node` silently tests a stale `dist/`.

`CLAUDE.md` and `package.json` describe a project that no longer exists:

- wrong file paths;
- "no ESLint/Prettier";
- "init integration tests";
- no `src/mcp`;
- "server-rendered dashboard".

`engines.node >= 18` is untested on an end-of-life Node. Flow chains (N267) carry the previous flow's merge, branch and PR fields into the next flow, with no documented intent.

Source: `N271/AUDIT.md` **A70, A71** (`CLAUDE.md`, `package.json` description, `engines`), **A73**.

## Goal

1. Every CLI command family is executed end-to-end by at least one test.
2. Every composer MCP tool has a test over a real stdio client.
3. Test servers use OS-assigned ports and awaited teardown, so the suite passes with `--test-concurrency` > 1 (or the remaining shared state is documented).
4. `CLAUDE.md` and package metadata match the code; the `engines` policy is decided.
5. The chain-advance behaviour for lifecycle fields is either documented as intended or changed (human decision).

## Scope

### In scope

- `packages/taskflow/test/*.test.mjs` — new and changed tests.
- `packages/taskflow/package.json` — `description`, `engines`, `test:node` guard.
- `CLAUDE.md` — repo root; facts only.
- `packages/taskflow/src/cli/commands/chain-advance.ts` (~:119-122) — only if the human chooses "snapshot" for A73.
- `packages/taskflow/README.md` — chain-advance note, if documenting.

### Out of scope

- Production code changes beyond A73 (if chosen). Bugs found by the new tests become new tasks via `/taskmaster`; don't fix them here.
- A client DOM test runner (new dependency). Propose separately if wanted.
- `RELEASING.md` and CHANGELOG `files` → N276.

## Implementation plan

1. **CLI round-trips (A70).** One test per family in a temp project:
   - `incident-create` → `incident-status` → `incident-resolve` → `incident-list`, asserting `incidents.json` and `openIncidentCount` (per N278's rule);
   - `change-request` → `change-start` → `change-end` → `next-change`;
   - `mr-update` (http URL accepted; per N274 a `javascript:` URL is rejected);
   - `migrate-hooks` on an old hook set (per N280).
   Run `update` only with `--help` / dry behaviour (it must not install; per N278).
2. **MCP tool tests (A70).** Over `StdioClientTransport` (pattern: `flow-chains.test.mjs` ~:351-361): `list`, `get`, `describe`, `create_module` / `update_module`, `create_agent` / `update_agent`, `create_flow`, `delete`, `install` (with N273's confirm gate), `uninstall`.
3. **Port isolation (A70).**
   - Spawned servers start with `--port 0` (or an env var), and the test reads the bound port from stdout or the port-pointer file. Add that support to the CLI only if it doesn't exist yet; that is the one allowed production change.
   - Await the child's `exit` after `kill()` in every `after()`.
   - Replace the 500 ms `execFileSync` timeouts with ≥ 5 s.
   - Try `--test-concurrency=4`; if it passes 5 runs in a row, keep it, else document the remaining shared state in a comment.
4. **Stale-dist guard (A70).** `test:node` (or a tiny pre-script) fails fast when any `src/**` file is newer than `dist/cli.js`, with a hint to run `pnpm test` / build.
5. **Docs drift (A71).**
   - `CLAUDE.md` :54 / :56 → `src/core/types.ts`, `src/core/schema/index.ts`.
   - Replace "No ESLint / Prettier configured" with the actual setup (`eslint.config.js`, prettier, husky pre-commit with lint-staged + typecheck).
   - Describe the test suite correctly (node:test over `dist/`, build first).
   - Add `src/mcp/` to the architecture list.
   - `packages/taskflow/package.json` `description` → React + Vite SPA dashboard.
6. **`engines` (A71).** Recommend `>=20` (Node 18 is EOL and CI runs 20). Change it only after the human confirms during `/task-analyze`; otherwise add a Node 18 job to `ci.yml`.
7. **Chain-advance fields (A73) — human decision.** Ask during `/task-analyze`:
   - **(a) Document.** Chained tasks keep `mergedAt` / `branch` / `mrUrl` / `pushes` from earlier flows. Add a README note and a test pinning the behaviour.
   - **(b) Snapshot.** On hop, push a `{flowId, mergedAt, branch, mrUrl}` segment and clear the live fields. Add a test.
   Implement only the chosen option.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new round-trip and MCP tests.
- The suite passes 5 consecutive runs (and with higher concurrency, if adopted).
- Touch a `src/` file, then `pnpm --dir packages/taskflow run test:node` → fails fast with the rebuild hint.
- `CLAUDE.md` claims checked against the tree (paths exist; tool configs exist).

## Notes

- Detail and evidence: `N271/AUDIT.md` A70, A71, A73 (port ranges and fixed ports listed per file).
- **Run last:** the new tests assert behaviour from N273, N274, N278 and N280. Write them against the merged behaviour.
- Recommended run: `/task-analyze N286` → `/task-implement N286`.
