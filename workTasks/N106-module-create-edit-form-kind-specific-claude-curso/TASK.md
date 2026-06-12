# N106 — Module create/edit form (kind-specific, Claude+Cursor targets)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-12

## Problem

- Custom modules (N102/N103) can only be authored via JSON files or raw API calls. The dashboard needs a create/edit form so users can author modules of every kind — prompt section, include, MCP server, hook, skill — targeted at Claude, Cursor, or both.

## Goal

1. `/module` browser gains 'New module' (and 'Edit' on custom modules): a form with kind selector and kind-specific fields — section (heading+body), include (ref), mcp (name+config JSON), hook (event/matcher/command), skill (name+content).
2. Harness-target field (claude / cursor / both) matching what the module schema supports for per-harness contributions.
3. Client-side validation mirrors the Zod schema (required fields per kind, JSON validity for mcp config); server 400 issues map back to fields.
4. Built-ins open read-only (existing detail view) — no edit affordance; custom modules support edit + delete (delete surfaces the 409-referenced error meaningfully).

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/` — module form (styled-components + existing form patterns from N86 foundation), wired to N103 endpoints; routes `/module/new`, `/module/:id/edit`.
- Kind-specific field components; shared JSON editor textarea with validity hint for mcp config.
- Component/integration tests per kind.

### Out of scope

- Agent/project forms (N107/N108). Flow editor. Markdown WYSIWYG (plain textarea is fine). Changing the module schema itself.

## Implementation plan

1. **Form shell** — route + page in SideLayout; kind selector drives field set; create vs edit mode from route.
2. **Field sets** — one component per kind; harness-target selector; live id preview (`custom:<slug>`).
3. **Submit** — POST/PUT to N103; map Zod issue paths to inline field errors; success navigates to `/module/:id` (live-refresh from N103 signal).
4. **Delete** — confirm dialog; 409 response renders the referencing agent list.
5. **Tests** — happy create per kind + one server-rejection mapping case.

## Verification

- Create one module of each kind in the playground via the form; each appears in the browser and composes (prompt-build smoke for a section module).
- Submitting invalid mcp JSON shows an inline error, not a toast-only failure.

## Notes

- Depends on N102+N103. Reuse N93 detail-view components for preview where cheap.
