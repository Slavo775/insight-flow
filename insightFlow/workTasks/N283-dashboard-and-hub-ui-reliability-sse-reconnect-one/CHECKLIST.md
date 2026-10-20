# N283 — Dashboard and hub UI reliability — SSE reconnect, one stream per page, store ordering, error boundaries, editor bugs — Checklist

## Done criteria

- [ ] All three SSE clients recreate a CLOSED stream with backoff and resync on reopen (A24)
- [ ] The hub overview holds one `/events` stream; `InstallModal` reuses the store's `/sse` (A56)
- [ ] `loadShard` ignores stale responses; the viewed task cannot be evicted; unknown ids show "not found" (A54a)
- [ ] A per-route error boundary with Retry exists; the root fallback can reload; `fetchShard` coerces risky fields; SSE frames use a shared `safeParse` (A54b, A54c)
- [ ] The hub client uses `apiFetch` (timeout + `res.ok`), shows errors including `/start` failures, and reloads notify settings in the same tab (A55)
- [ ] Flow editor: spaces kept while typing; drag-stop uses fresh nodes; unsaved draft guarded on navigation (A57)
- [ ] DocViewer and flow columns refresh; `seen` bounded; stable activity keys; no "now ago"; HEX6 guard on lifecycle colors; dev proxy lists `/sse`, `/log`, `/config` (A58)
- [ ] Install progress frames filtered by `kind` + `id`; `NodePopover` clamped; `StateRow` stable keys (A79)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (dashboard and hub render; `e2e-smoke`, `master-proxy`, `provider-dashboard` green)

## Verification

- [ ] Unit tests for the backoff helper, `loadShard` ordering, `fetchShard` coercion, `safeParse`, HEX6 helper
- [ ] Manual: the stream recovers after a project restart behind the hub
- [ ] Manual: 4 hub tabs all load; one `/events` per tab
- [ ] Manual: `/task/N999` shows "not found"; a malformed task no longer blanks the board
