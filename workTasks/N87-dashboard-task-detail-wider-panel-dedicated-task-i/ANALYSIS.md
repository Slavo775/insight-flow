# N87 — Dashboard task detail — wider panel + dedicated /task/:id page (react-router) + reading mode — Analysis

**Created:** 2026-06-10
**Author:** task-analyze

## Problem framing

Request: the task detail "sheet" should be wider (80%), a button to open a "detail page" of the current task, a markdown preview, "full screen", and bigger text + bigger spacing. Grounding in the code: the detail is a fixed **480px** right slide-over (`.detail-panel`); the markdown viewer already exists (N85 Documents tabs) but is cramped; there is **no client routing** (no react-router) so no URL-addressable detail; tokens are intentionally dense (mono 10–13px). So the real goal is a **comfortable, addressable task-detail reading experience** — more width, a real page, and bigger reading type — without disturbing the deliberately dense dashboard.

## Goal

- Widened slide-over (~80vw) + a dedicated `/task/:id` full page (URL-addressable) reachable via a button on the selected task.
- A reading-mode (larger type/space) scoped to the detail/page only.
- No backend change; read-only/agent-driven preserved; dense dashboard untouched.

## Options considered

### Detail view
| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Widen panel + full-screen toggle (no router) | no new dep; smallest | not a real "page" (no URL/back-button) | S |
| B — Dedicated `/task/:id` route (react-router) | shareable URL + back-button; roomy reading | new dep; SPA becomes multi-route | M |
| C — **Both (CHOSEN)** | quick-peek panel *and* a full page | most surface | M |

### "Bigger text + spacing"
| Option | Pros | Cons |
|--------|------|------|
| Detail/reading-only *(CHOSEN, strategist rec.)* | comfortable reading; dense dashboard untouched; low risk | two type scales to maintain |
| Global token bump | uniform | changes the whole product feel; touches every view |

## Decision

- **Chosen: Option C (widened panel + dedicated `/task/:id` page via react-router), reading-mode scoped to detail-only, button opens the selected task.**
- **Rationale:** Owner wants both a quick peek and a real, shareable detail page, and comfortable markdown reading without abandoning the dense terminal aesthetic elsewhere. Routing is cheap to add and needs **no backend change** — N85's server already serves the SPA shell for any path (the catch-all fallthrough), so `BrowserRouter` deep-links resolve. Reading-mode is implemented by feeding the N86 styled primitives a larger nested theme (+ scoped `.markdown-body` CSS), so it's contained.

## Open questions

- `[non-blocking]` Router flavor — defaulted to `BrowserRouter` (clean URLs; fallthrough supports deep-links). `HashRouter` would avoid any server reliance but the fallthrough already handles it.
- `[non-blocking]` Reading-mode magnitude — pick comfortable values (e.g. +2–4px type, larger spacing); implementer's judgment.
- `[non-blocking]` `TaskDetailPage` must resolve `:id` even when it lives in a shard other than the current one — load the right shard on demand.
- `[non-blocking]` Vitest client tests deferred (consistent with N86) unless requested.

## Sources

None — discussion was self-contained (grounded in `src/dashboard/client/{styles.css,theme.ts,DetailPanel.tsx,api.ts}`, `package.json`, and the N85 server fallthrough).

## Handoff brief

> **Title:** Dashboard task detail — wider panel + dedicated /task/:id page (react-router) + reading mode · **Type:** feat · **Priority:** medium
> Widen the detail slide-over to ~80vw and add a URL-addressable `/task/:id` full page (react-router `BrowserRouter`; deep-links resolve via the existing server SPA-fallthrough — no backend change) reached by an "open full page" button on the selected task. Reuse the existing DetailPanel content for both panel and page. Add a reading-mode (larger type + spacing) scoped to the detail/page only (nested ThemeProvider with a bumped theme + scoped `.markdown-body`) so the markdown docs are comfortable; the dense Kanban/timeline/activity stay unchanged. Read-only/agent-driven; no new features; master/`/config` untouched.
