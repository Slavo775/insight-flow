# N53 — interactive prompts in init for hooks and activity engine

**Type:** feat
**Priority:** medium
**Created:** 2026-05-26

## Problem

`insight-flow init` silently writes `activityEngine.enabled: false` and skips hook installation with no explanation. Users who run `init` before setting up config miss the hooks entirely and don't know what they opted out of. There's no guidance at the point where the decision matters — the first run.

## Goal

1. `insight-flow init` asks two yes/no questions after scaffolding files, before any hook installation.
2. **Question 1 — lifecycle hooks:** "Enable task lifecycle events? Tracks status changes per task in the dashboard. No token cost. (Y/n)" — installs lifecycle hooks + writes `events` entries; default yes.
3. **Question 2 — activity engine:** "Enable agent activity tracking? Shows what Claude is doing in the dashboard. Small token overhead from phase markers. (y/N)" — enables `activityEngine` in config + installs activity hooks; default no.
4. Config is updated on disk to reflect the answers before hooks are installed.
5. Re-running `init` on an already-configured project skips prompts and respects existing config (idempotent, no overwrite).

## Scope

### In scope

- `packages/taskflow/src/init/index.ts` — add `promptUser(question: string, defaultYes: boolean): Promise<boolean>` using `node:readline`; call it twice after file scaffolding; update config on disk; conditionally call hook installers.
- `packages/taskflow/src/cli.ts` — `initProject` is currently sync; make it `async` to support `await promptUser(...)`.
- `packages/taskflow/src/init/index.ts` — skip prompts when `--yes` / `-y` flag is passed (accept all defaults non-interactively, useful for CI/scripted installs).
- `packages/taskflow/src/init/index.ts` — skip prompts when config already exists and has explicit values set for `activityEngine.enabled` and lifecycle hooks already installed.

### Out of scope

- Sounds prompt (not needed).
- Any prompt beyond the two questions above.
- Changes to `taskflow.config.json` schema.
- Windows / Linux notification improvements.

## Implementation plan

1. **Make `initProject` async** — update signature in `packages/taskflow/src/init/index.ts` to `export async function initProject(...)`. Update call site in `packages/taskflow/src/cli.ts` to `await initProject(...)` (wrap in async IIFE or make the CLI handler async).

2. **Add `promptUser` helper** — in `init/index.ts`:
   ```ts
   async function promptUser(question: string, defaultYes: boolean): Promise<boolean> {
     const rl = createInterface({ input: process.stdin, output: process.stdout });
     return new Promise((resolve) => {
       rl.question(question, (answer) => {
         rl.close();
         const a = answer.trim().toLowerCase();
         if (a === "") resolve(defaultYes);
         else resolve(a === "y" || a === "yes");
       });
     });
   }
   ```

3. **Detect skip conditions** — before prompting, check:
   - `opts.yes` / `opts.y` flag → use defaults silently.
   - Config already existed on disk AND `activityEngine.enabled` is explicitly set → skip activity prompt.
   - Config already existed AND lifecycle hooks already registered in settings → skip lifecycle prompt.
   - If both skip conditions met → skip all prompts entirely.

4. **Ask lifecycle hooks question** — default yes (`Y/n`). If yes: call `installLifecycleHooks(cwd)` (already exists in `activity-hook.ts`). No config change needed (lifecycle hooks are independent of `activityEngine`).

5. **Ask activity engine question** — default no (`y/N`). If yes: set `config.activityEngine.enabled = true` in the in-memory config object, write updated config back to `taskflow.config.json`, then call `installActivityHook` + `installEnrichmentHooks`.

6. **Update console output** — print a one-line explanation before each prompt so users understand the trade-off:
   - Before Q1: `"  Lifecycle hooks write task status changes to events.json (zero token cost)."`
   - Before Q2: `"  Activity tracking shows agent phase markers in the dashboard (adds ~50 tokens/turn)."`

## Verification

- Fresh `insight-flow init` in an empty dir presents both prompts in sequence.
- Answering `y` to lifecycle hooks → `.claude/hooks/lifecycle-*.sh` files created and registered in settings.
- Answering `y` to activity engine → `taskflow.config.json` updated with `activityEngine.enabled: true` + activity hooks installed.
- Answering `n` (or Enter on default-no) to activity → config keeps `enabled: false`, no activity hooks installed.
- Re-running `init` on existing project → prompts skipped, existing config respected.
- `insight-flow init --yes` → no prompts, both defaults applied (lifecycle yes, activity no).
- `pnpm --dir packages/taskflow run build` passes with no TypeScript errors.

## Notes

- `node:readline` is used — no new dependencies.
- The `--yes` flag makes `init` safe to call from scripts and other tooling.
- Prompts only appear when stdout is a TTY (`process.stdout.isTTY`). If piped/non-interactive, fall back to defaults silently — add this guard in `promptUser`.
- Related: N51 (init calls prompt-build) — the enforcement block generation step runs after prompts, not before.
