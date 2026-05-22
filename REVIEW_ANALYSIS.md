# Project Review: insight-flow (v0.3.1)

**Date:** 2026-05-20  
**Status:** Under Active Development  
**Reviewer:** Gemini CLI Agent

---

## Executive Summary

**insight-flow** is a high-utility AI task orchestration workbench. It successfully bridges the gap between high-level task specifications and autonomous agent execution through a sharded JSON storage pattern and a well-defined state machine. While the core architecture is brilliant for its use case, the project is currently in a "half-migrated" state with significant logic duplication that must be resolved to achieve production readiness.

---

## 1. Architecture & Storage

**Rating: 9/10**

- **The Sharded JSON Pattern**: Utilizing `tasks-Nxx-Nyy.json` files is a masterstroke. It solves the "context window overflow" problem for agents, prevents massive Git merge conflicts, and allows the task database to be human-readable and version-controlled.
- **Activity Engine**: The real-time broadcasting of tool usage via WebSockets to a React dashboard provides critical visibility into agent behavior ("The 'Black Box' problem").
- **Vulnerability**: Reliance on `JSON.parse` without schema validation (e.g., Zod) makes the system fragile to manual edits or corrupted writes.

## 2. Code Quality & Migration Debt

**Rating: 7/10**

- **Logic Duplication (CRITICAL)**: `scripts/task-tracker.mjs` and `packages/taskflow/src/cli.ts` share ~95% of their logic. This is a high-risk maintenance trap.
- **Standards**: The TypeScript implementation is clean, and the command-pattern used in the CLI is modular.
- **Path Management**: Excessive use of relative path resolving (`../../..`) makes the package less portable across different project structures.

## 3. UX & Usability

**Rating: 8/10**

- **CLI UX**: The verb-noun API (`implement-start`, `review-end`) is intuitive. The `next` command is a "killer feature" that eliminates decision fatigue for both humans and agents.
- **Dashboard**: High-quality UI using Shadcn/Recharts. The "Live Sync" feature makes the dashboard feel alive and reactive to background agent processes.
- **Onboarding**: The `init` command is functional but sparse. It lacks scaffolding for initial roles and example tasks.

## 4. Agent Flow & Role Health

**Rating: 8.5/10**

- **Role Definitions**: The `.md` role specifications are excellent. Clear Input/Output contracts and strict "NEVER" rules are foundational for high-performing agents.
- **Lifecycle Management**: The distinction between "Full Implementation" and "Change Implementation" modes is a sophisticated optimization that saves tokens and prevents regressions.
- **Gap**: No "Orchestrator" role exists to monitor pipeline health or re-prioritize tasks based on bottleneck analysis.

---

## 5. Required Improvements (Strict)

### Phase 1: Bridge Burning

1.  **Delete `scripts/task-tracker.mjs`**: Migrate all `TASK_*_ROLE.md` files to use the `insight-flow` binary.
2.  **Centralize CLI Logic**: Ensure `packages/taskflow` is the single source of truth.

### Phase 2: Hardening

1.  **Schema Validation**: Introduce `Zod` to the storage layer. All file reads must be validated to prevent runtime crashes from malformed JSON.
2.  **Template Scaffolding**: Move role definitions into the package and have `init` copy them to the local project.

### Phase 3: Build & Distribution

1.  **Standardize UI Build**: Move from a custom `.mjs` build script to a standard Vite build configuration targeting `dist/ui`.
2.  **Binary Pathing**: Refactor path resolution to be project-root relative rather than `__dirname` relative to support global installation.

---

## Final Grade: **A-**

A robust, innovative workbench that is one "cleanup" phase away from being a best-in-class tool for AI-assisted engineering.
