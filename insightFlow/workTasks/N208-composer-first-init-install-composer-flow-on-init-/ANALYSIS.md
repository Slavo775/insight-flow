# N208 — Composer-first init — install composer flow on init, install-flow command, default flow opt-in — Analysis

**Created:** 2026-07-09
**Author:** task-analyze

## Problem framing

`insight-flow init` today scaffolds the **default flow's** role commands (`.claude/commands/task-*.md`: task-analyze, taskmaster, task-implement, task-review, task-git, …) and treats `default` as the flow for all new tasks. The human wants a shift: a fresh project should start with the **composer flow** (the tool for *building* flows/agents/modules), and the **default flow should become opt-in** — the user installs it (`insight-flow install-flow default`) or builds their own flow with the composer. This is **Task B** of the init review (Task A / N207 shipped events-on + `agents.extend` deprecation; Spike C found the non-coder global path doesn't exist — out of scope here).

**Root cause, not symptom:** init hard-wires the default task flow as the starting point; there's no "install a flow" primitive, and `default` is baked in as the create-time fallback.

## Mechanics (verified in code)

- **init scaffolds the default flow's commands** via the editor providers (`agents/init/providers/*`), writing `.claude/commands/task-*.md`. It does **not** install a flow object.
- **No `install-flow` CLI exists** — only `install-activity-hook` / `install-lifecycle-hooks`. `executeInstall(kind, id, …)` (`agents/flow-install.ts:324`) is the engine the composer MCP uses; a CLI wrapper is new.
- **`default` is the hard-coded create fallback** — `create.ts` resolves `--flow → --agent → byType → flows.defaultFlow → "default"`, and an unknown/missing flow **falls back to `"default"` non-fatally**. So removing `default` as *config* default still lands tasks on the `default` built-in unless the fallback itself changes.

## Goal

1. **New `insight-flow install-flow <id>` CLI command** — installs a built-in or custom flow's artifacts (commands + subagents + any `mcp-server` + hooks) via `executeInstall`. Reusable primitive.
2. **`init` installs the composer flow by default** — emits the `composer-authoring` artifacts (`task-authoring-*` commands + the 12 subagents + `mcp-composer` + activity) instead of scaffolding the default flow's `task-*` commands.
3. **Soft "default not default"** — stop scaffolding/promoting the default flow, but **keep it as the `create` fallback** (safety net; nothing errors). Document the mismatch (composer-only project, `create` still uses `default` under the hood) + a hint.
4. **Docs** — the new first-run: init gives the composer; `insight-flow install-flow default` for the standard task lifecycle, or build your own flow.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — composer-first init + `install-flow` command + soft default | Delivers the chosen direction; reversible (default still there); one reusable primitive | Changes every new project's first-run; init now emits the composer artifacts | Medium-High |
| B — hard "no default fallback" | Truest "bring your own flow" | `create` could error / needs a "pick a flow" path; touches the core create path; risky | High |
| C — flag-gated (`init --composer` opt-in) | No default change; safe | Doesn't make composer the default the human asked for | Low |

## Decision

- **Chosen option: A** (confirmed by the human: "composer + a way to add default" + "soft"). Composer-first init, a new `install-flow` command, and keep `default` as the technical create fallback.
- Rationale: gives the requested composer-first onboarding while staying non-fatal (the `default` safety net means a composer-only project never errors on `create`); the `install-flow` primitive is reused by both init and the "add the default later" path.

## Open questions

- `[blocking]` **What exactly does init emit now?** Confirm `executeInstall(kind="flow", id="composer-authoring")` from inside init produces the right artifacts (`.claude/commands/task-authoring-*`, `.claude/agents/*`, `.mcp.json` composer entry, activity hooks) and is idempotent/re-runnable. The implementer must verify against a real `init` run.
- `[non-blocking]` **The composer-only mismatch.** With no `task-*` commands scaffolded but `default` still the create fallback, a user who runs `insight-flow create` gets a task bound to `default` with no `/task-*` commands to drive it. Mitigate with a one-line hint on `create` (e.g. "no flow installed — run `insight-flow install-flow default`") + docs. Keep it a hint, not an error (soft).
- `[non-blocking]` **`--editor` / provider scaffolding.** init still scaffolds the shared enforcement/security/skill assets and editor providers; only the *flow commands* change from default → composer. Don't drop the baseline scaffolding.
- `[non-blocking]` **Existing projects / re-init.** `init` on a project that already has the default flow commands should not delete them; the composer-first behaviour is for fresh inits. Decide the re-init semantics (add composer, leave existing).

## Sources

- None — self-contained. Grounded in this repo's source: `agents/init/index.ts` + `agents/init/providers/*` (scaffolding), `agents/flow-install.ts` (`executeInstall`), `cli/commands/create.ts` (the `default` fallback chain), `cli/cli.ts` (existing `install-*` commands). Plus the Spike C finding (dashboard requires an init'd project).

## Handoff brief

Title: *Composer-first init — install composer flow on init, install-flow command, default flow opt-in*. Type: feat. Priority: high. Tags: init, onboarding, cli. Scope: Add an `insight-flow install-flow <id>` CLI command (wraps `executeInstall` for a built-in/custom flow). Make `insight-flow init` install the `composer-authoring` flow by default (its `task-authoring-*` commands + subagents + `mcp-composer` + activity) instead of scaffolding the default flow's `task-*` commands; keep `default` as the non-fatal `create` fallback (soft), with a hint + docs telling users to `insight-flow install-flow default` or build their own flow. Non-coder/global onboarding is out of scope (separate effort). Merge into `agents-approved`.
