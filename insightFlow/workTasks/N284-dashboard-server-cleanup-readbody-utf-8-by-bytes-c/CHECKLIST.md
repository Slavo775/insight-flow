# N284 — Dashboard server cleanup — readBody UTF-8 by bytes, consistent error codes, route table, dead routes — Checklist

## Done criteria

- [ ] `readBody` collects Buffers, limits by bytes, decodes once; 413 behaviour unchanged (A62)
- [ ] One `readJson` helper: bad JSON → 400, handler error → 500 (logged, scrubbed, `headersSent`-guarded); used by every body route (A63, A64)
- [ ] `dispatch` is an ordered route table; unmatched `/api/*` → JSON 404; wrong method → JSON 405 with `Allow`; the N272 gate runs first (A64)
- [ ] Kind/id validation exists once (A64)
- [ ] Custom-defs revision is re-checked before rename, or the single-user assumption is documented (A63)
- [ ] `/api/activity` deleted and `e2e-smoke` updated; `/overview` kept (A65)
- [ ] `escHtml` escapes `'` and its doc is correct (A78)
- [ ] Custom include previews work behind a project-root guard (A78)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`custom-defs-api`, `http-util`, `log-events-endpoint`, `e2e-smoke`, `dashboard-error-boundary` green)

## Verification

- [ ] Tests: split multibyte body, byte cap, 400 / 500 / 404 / 405 codes, `escHtml`, include-doc guard
- [ ] Manual: a ~150 KB Slovak-text module prompt round-trips without `�`
