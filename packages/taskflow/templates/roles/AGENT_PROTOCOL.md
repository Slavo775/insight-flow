SHARED AGENT PROTOCOL — applies to every insight-flow role.

Each role file inherits this protocol via `@AGENT_PROTOCOL.md` and only documents its **role-specific overrides** (which CLI mark commands, which files to read, which checks to run). When this protocol and a role file disagree, the role file wins for that role only.

---

STANDARD WORKFLOW (apply unless the role explicitly overrides a step)

1. **Resolve task** — if no ID was provided by the human, run the role's task-picker CLI (`insight-flow next` / `next-review` / `next-fix` / `next-change` / `current`). Capture the returned `id` and `folder`.
2. **Mark started** — run the role's lifecycle-start CLI (e.g. `implement-start`, `review-start`, `fix-start`, `change-start`, `incident-status investigating`). All mutations go through the CLI — never edit tracker JSON or task-folder files directly with Edit/Write.
3. **Read context** — `insight-flow show --id Nxx --summary --spec` returns lean state + TASK.md + CHECKLIST.md content inline (single Bash call beats two `Read` calls). For REVIEW.md / source files, use `Read` with offset/limit.
4. **Plan** — follow the "Implementation plan" / role workflow in dependency order. No creative scope expansion.
5. **Execute** — apply the role's actual work (write code, post review, record verdict, etc.). Match existing code patterns.
6. **Quality gates** — run the project's typecheck, lint, and test commands as defined in `taskflow.config.json.agents.extend.<role>` arrays (per N12's extension mechanism) or your project README. insight-flow ships no defaults — if no commands are defined for your stack, skip the step and note it in the report. Fix in-scope failures and re-run. Report (don't fix) out-of-scope failures.
7. **Mark completed** — run the role's lifecycle-end CLI (`implement-end`, `review-end`, `fix-end`, `change-end`, `incident-resolve`).
8. **Push** — call `/task-git` to branch (if needed), commit, push, and (optionally) open the PR.
9. **Report** — short, factual: files touched, gate results, any checklist items not met and why.

---

UNIVERSAL NEVER

- Never use Edit / Write / file-creation tools on `tracker.json`, `TASK.md`, `CHECKLIST.md`, or anything inside the tracker directory for **state mutations** — go through the CLI. (Editing the narrative *content* of TASK.md / CHECKLIST.md / REVIEW.md after the CLI has scaffolded them is fine and expected — that's not state.)
- Never add or remove dependencies without explicit human approval.
- Never modify files unrelated to the task scope.
- Never force-push to `main` / `master`.
- Never skip Git hooks (`--no-verify`) unless the human explicitly asks.
- Never skip tests when the task's Verification section requires them.

---

TRACKER COMMAND CHEAT-SHEET (for quick reference)

- Resolve: `current`, `show --id Nxx [--summary] [--spec]`, `next`, `next-review`, `next-fix`, `next-change`.
- Mutate: `create`, `status`, `implement-start|end`, `review-start|end`, `fix-start|end`, `change-request|start|end`, `incident-create|status|resolve`, `push`, `mr-update`, `merge`, `done`.
- Maintenance: `list`, `stats [--tokens]`, `incident-list`, `migrate`, `migrate-reviews`, `prompt-build [--apply]`.

---

QUALITY BAR (applies to roles that produce code or specs)

- All gates pass before handoff.
- In-scope failures must be fixed; out-of-scope failures are reported and the role stops.
- "Good enough for non-critical paths" — do not gold-plate.

---

If a procedural step here conflicts with `@AGENT_ENFORCEMENT.md`, both files agree: state mutations through CLI, hooks not skipped, etc. `AGENT_ENFORCEMENT.md` is the strict-enforcement reference; this file is the workflow reference.

---

Project-specific commands (typecheck, lint, test, PR-create) belong in `taskflow.config.json.agents.extend.<agent>` — see `CLAUDE.md` for examples.
