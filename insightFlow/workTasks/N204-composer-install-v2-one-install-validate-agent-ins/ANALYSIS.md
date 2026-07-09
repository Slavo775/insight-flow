# N204 — Composer install v2 — one install+validate agent (install-first), edge-case checklist, rollback-on-failure — Analysis

**Created:** 2026-07-08
**Author:** task-analyze

## Problem framing

The composer (authoring) flow's tail is `authoring-test` → `authoring-install` → done. The tester validates the definitions **before** install (compose, dry-run, throwaway smoke), then the installer installs and marks done. Two issues:

1. **Order is backwards for what the human wants.** They want to **install first, then validate the real install** (files written, MCP registered, commands present) — and only mark done once the installed thing is confirmed working.
2. **The installer is passive.** It installs and stops; it does not handle the issues that actually pop up during install, nor does it install **flows** prominently, nor does it know the edge cases or when a fix needs human sign-off.

Root cause, not symptom: the pre-install dry-run (the tester) duplicates work the reviewer (N203) already does (schema/compose), while the thing that matters — *did the real install succeed?* — is never checked. And the installer has no codified playbook for install failures. Install is **reference-safe and reversible (uninstall)**, which makes install-first safe.

## Goal

1. **One** `authoring-install` agent (remove `authoring-test`) that runs, in order: **pre-flight plan → install → post-install validate → done**.
2. It installs **agents, modules, and flows** via the composer MCP `install`, and validates the *real* install afterwards (artifacts present, references resolve, a smoke exercise).
3. It handles the known install **edge cases** from a single codified checklist, with a hard boundary: fix **installs**, never **definitions** or **unrelated settings**.
4. On validation failure it **rolls back (uninstall)** and hands **back to the implementer** (`fix-needed`) for re-authoring + re-review.
5. Any fix that would change **settings unrelated to this task/flow** (e.g. overwriting an unrelated `.mcp.json` entry) requires **human approval first**.
6. On success → `done`. End of flow.

## The real install edge cases (grounded in `flow-install.ts` / `mcp/composer.ts`)

- **`UnknownTargetError`** — a `custom:` id that doesn't exist (dangling reference) → definition bug → rollback + hand to implement.
- **`NotInstallableError`** — a module kind that can't be installed → hand back.
- **`InstallConflictError`** — an `.mcp.json` server name already registered with a *different* config (overwrite is snapshotted/undoable). If the conflicting entry is **unrelated to this task** → human approval before overwrite.
- **Missing secret** — an unresolved `${VAR}` input → tell the user to add it (dashboard install UI or `.insight-flow/secrets.local.json`) and retry.
- **Command/hook/skill file already present** — report; fix if install-scoped, else hand back.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — One agent: plan → install → validate → done; edge cases in a new `composer-install-checklist` module; rollback+hand-back on failure | Matches N202/N203 (merge two agents); removes reviewer-duplicated dry-run; the thing that matters (real install) is verified; single edge-case source | Needs a way for the installer to emit `fix-needed` on rollback (no `install-end` verb today) | Medium |
| B — Two agents, reordered: install → test(validate) → done | Clear separation | Re-introduces a handoff the series has been collapsing; more nodes | Medium |
| C — Keep order (test → install), just add edge-case handling | Small | Doesn't deliver install-first or the real-install validation | Low |

## Decision

- **Chosen option: A** (confirmed with the human via clarifying questions): one merged agent, rollback + hand back on failure, edge cases in a **new `composer-install-checklist` section module**.
- Rationale: consistent with the just-shipped dual-mode pattern (N202 build+fix, N203 AI+human); install's reversibility makes install-first safe; a codified checklist gives the installer a real playbook; keeping the fix boundary (installs not definitions, no unrelated settings without approval) prevents the installer from becoming a blunt instrument.

## Open questions

- `[non-blocking]` **How does the installer emit `fix-needed` on rollback?** Today the install step ends with `insight-flow done`; there is no `install-end` verb. The implementer must pick a mechanism (a generic status-write to `fix-needed`, reuse of an existing verb, or a small new command) so the `install --fix-needed--> implement` edge can fire. Keep it composer-flow-scoped; don't disturb the base flow.
- `[non-blocking]` **Detecting "unrelated" settings.** The `InstallConflictError` carries the conflicting key; the installer should treat a conflict on an entry it did not author (not in this task's `custom:` set / not in the flow's install list) as "unrelated" → human approval. Exact heuristic is the implementer's call.
- `[non-blocking]` **Stale artifact in consumer projects.** Projects that already installed the composer flow keep a `task-authoring-test` command until a flow re-install — out of scope (same as N202's `task-authoring-fix`, N203's `task-authoring-human-review`).

## Sources

- None — self-contained. Grounded in this repo's source: `src/agents/flow-install.ts` (install plan + `UnknownTargetError` / `NotInstallableError` / `InstallConflictError` / secret resolution), `src/mcp/composer.ts` (install/uninstall tool + structured errors), `src/agents/project/authoring.json`, `src/agents/modules/roles/authoring.json`.

## Handoff brief

Title: *Composer install v2 — one install+validate agent (install-first), edge-case checklist, rollback-on-failure*. Type: feat. Priority: high. Tags: authoring, composer. Scope: In the composer (authoring) flow, merge `authoring-test` into `authoring-install` so one agent runs pre-flight plan → install (agents/modules/flows) → post-install validation → done. Add a `composer-install-checklist` section module codifying the install edge cases (unknown target, `.mcp.json` conflict, missing secret, not-installable, file conflict) and the boundaries: fix installs not definitions, get human approval before touching unrelated settings, roll back + hand to the implementer (`fix-needed`) on validation failure. Rewire the flow tail (`review --approved--> install`, `install --done`, `install --fix-needed--> implement`) and update docs + the compose test. Composer flow only; merge into `agents-approved`.
