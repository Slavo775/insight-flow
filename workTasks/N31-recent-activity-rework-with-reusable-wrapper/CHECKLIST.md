# N31 — Recent activity rework with reusable wrapper — Checklist

## Done criteria

- [ ] `loadRecentEvents()` fetches from `/api/activity` (not `/api/session-events`)
- [ ] `isLifecycleEvent(ev)` helper added and filters correctly for task lifecycle events
- [ ] `renderRecentEvents()` rewrites items as `.act-item-list` / `actItemHtml(color, inner)` markup
- [ ] Each item shows: taskId badge → "→" → status badge (colored) → "by source" → relative time
- [ ] Status badge background and `.act-item` border-left use `taskStatusColor(status)` color
- [ ] Old `.recent-event-item` CSS removed from CSS const
- [ ] Empty state renders a text message (no errors) when no lifecycle events exist

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0

## Verification

- [ ] `pnpm play` → Recent Activity tab shows colored `.act-item` wrappers with "N28 → merged by task-git" format
- [ ] Merging / pushing a task via task-git generates an entry visible in the tab within 5 s (poll interval)
- [ ] No regression in Claude Activity tab rendering
