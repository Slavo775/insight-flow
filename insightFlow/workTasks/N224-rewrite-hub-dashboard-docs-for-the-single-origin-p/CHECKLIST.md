# N224 — Rewrite hub/dashboard docs for the single-origin PWA hub — Checklist

## Done criteria

- [x] `built-ins/master-server.md` rewritten: `hub.json` persistent registry, `/project/<id>/` proxy, running/stopped switcher + Open/Start, New Project modal (folder browser + install options + composer flow), PWA install + notifications, liveness + refresh, security model
- [x] `guides/multi-project-master.md` rewritten to the hub switcher workflow (single origin, PWA, LAN/mobile)
- [x] Mobile/PWA + `INSIGHT_FLOW_TRUSTED_HOSTS` (from N223) + trust boundary documented (`:::warning Trust boundary` in both docs)
- [x] `bulk-*` positioned as **legacy**; hub is the primary multi-project path (both docs + `cli/setup-and-dashboard.md`)
- [x] `dashboard/index.md`, `cli/setup-and-dashboard.md`, root `README.md` corrected + consistent (+ `built-ins/index.md` description fixed)
- [x] No stale claims remain (no "in-memory registry" / `prompt` / "run in its folder to open" / "card grid" / "links to each project")

## Quality gates

- [x] Docusaurus site builds clean (no broken-link / frontmatter errors) — `cd website && pnpm build` → SUCCESS (onBrokenLinks throws by default; none)
- [x] `npm run lint` — N/A (docs/markdown only, no code/config touched)
- [x] No stale command names / ports / env keys — verified `6100`, `6006`, `6007`, `INSIGHT_FLOW_BROWSE_ROOT`, `INSIGHT_FLOW_TRUSTED_HOSTS` present + correct. (`INSIGHT_FLOW_PROJECTS_HOME` deliberately **not** documented as the scaffold base — the audit found it unused in the New-project create flow, which scaffolds under the browsed `INSIGHT_FLOW_BROWSE_ROOT` dir.)
- [x] Every claim verified against the shipped code (via a full code-audit fact-sheet of `master/server.ts`, `overview.ts`, `index.ts`, `registry.ts`, `global-config.ts`, `agents/init`)

## Verification

- [x] Grep the two rewritten docs → none of the stale phrases; all new features present (`/project/<id>`, `hub.json`, `INSIGHT_FLOW_TRUSTED_HOSTS`, New project, PWA, Running/Stopped, Start)
- [x] `bulk-*` labeled legacy
- [x] `cd website && pnpm build` (docusaurus) succeeds
- [~] Fresh-reader skim matches the running hub — self-reviewed against the audit; a human skim is the review step
