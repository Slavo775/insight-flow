# N49 — project-wide-docs-audit-and-update — Checklist

## Done criteria

- [ ] `README.md`: no "React" mention in dashboard description (line ~130).
- [ ] `README.md`: `## What You Get` tree includes `.claude/hooks/`.
- [ ] `README.md`: `## Configuration` table trimmed to 5 core keys + pointer to `packages/taskflow/README.md`.
- [ ] `README.md`: `## Claude Code Integration` table has 9 rows including `/taskmaster-change` and `/task-git`.
- [ ] `CHANGELOG.md` (root): N47 entry under `[0.7.0] ### Added`.
- [ ] `CHANGELOG.md` (root): N48 entry under `[0.7.0] ### Docs`.
- [ ] `packages/taskflow/CHANGELOG.md`: same N47 and N48 entries as root.

## Quality gates

- [ ] `git diff --name-only` shows only `README.md`, `CHANGELOG.md`, `packages/taskflow/CHANGELOG.md`.
- [ ] No source `.ts` files modified.

## Verification

- [ ] `grep -n "React" README.md` — no matches.
- [ ] `grep -n "taskmaster-change" README.md` — matches Claude Code Integration table.
- [ ] `grep -n "task-git" README.md` — matches Claude Code Integration table.
- [ ] `grep -n "hooks/" README.md` — matches `## What You Get` tree.
- [ ] Both CHANGELOG files contain `N47` and `N48` under `[0.7.0]`.
