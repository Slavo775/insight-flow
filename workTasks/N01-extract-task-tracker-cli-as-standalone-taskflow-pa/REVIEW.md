# N01 — Review

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-13
**Verdict:** FIX NEEDED

### Blockers
- **Claude Code setup missing from `taskflow init`** — `taskflow init` should also generate Claude Code configuration:
  - **Global setup**: register skills/slash commands (e.g., `/taskmaster`, `/task-implement`, `/task-review`, `/task-git`, etc.) in `.claude/settings.json` so they're available as Claude Code skills.
  - **Local setup**: generate a project-level `CLAUDE.md` with taskflow context — available commands, how the task system works, conventions for using the CLI. This gives Claude Code automatic context about the task workflow when working in the project.

### Suggestions (non-blocking)
- None

### Notes
- The user wants the same Storybook-like experience: `taskflow init` sets everything up so Claude Code "just knows" about the task system without manual config.
