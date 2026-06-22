# N172 — Install overwrite undo/rollback — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- N165 added an explicit **overwrite** (force) path for a differing install conflict (e.g. a changed `.mcp.json` server config). Once you overwrite, there's no in-app **undo** to restore the prior config.
- **Speculative / low value**: `.mcp.json` is gitignored (N165), and for repos it (or its history) is recoverable via git; the secrets store also retains prior values. So recovery already exists out-of-band. Recorded because the owner chose to track it; strategist flagged it as low priority.

## Goal

1. Before an overwrite, capture the prior definition.
2. Offer an undo (restore the captured prior `.mcp.json` server entry) shortly after.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — In-modal "Undo overwrite" using the pre-overwrite snapshot held in the response | Simple, scoped to the session | Only undoes the last overwrite; not persistent | S–M |
| B — Persisted backup file (e.g. `.mcp.json.bak` / a history dir) | Survives reloads | New artifact to manage + gitignore | M |
| C — Defer (rely on git / gitignored recovery) | No work | No in-app affordance | — |

## Decision

- Lean **C / A**: given git already covers recovery, the cheapest worthwhile slice is **A** (the conflict response already carries the `installed` side, so the modal can offer a one-click restore right after an overwrite). Persisted backups (B) are over-engineering for the value. **Low priority.**

## Open questions

- `[blocking]` Is this worth doing at all given gitignored `.mcp.json` + git history already provide recovery? Strategist recommendation: probably not until asked.
- `[non-blocking]` Undo scope — only the just-overwritten server entry, or the whole `.mcp.json`? Entry-level is safer.
- `[non-blocking]` Time window / single-undo vs history.

## Sources

- `agents/emit.ts` (`applyMcpServers`, `InstallConflictError.conflict.installed`), `dashboard/client/components/InstallModal.tsx` (diff + Overwrite) — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.

## Handoff brief

- Title: Install overwrite undo/rollback · type: feat · priority: low. After an N165 overwrite of a differing `.mcp.json` server config, offer a one-click "undo" that restores the captured prior entry (the conflict already carries the `installed` side). Speculative/low value — `.mcp.json` is gitignored and git already covers recovery; build only if the in-app affordance is actually wanted. Related: N165.
