# N224 — Rewrite hub/dashboard docs for the single-origin PWA hub — Checklist

## Done criteria

- [ ] `built-ins/master-server.md` rewritten: `hub.json` persistent registry, `/project/<id>/` proxy, running/stopped switcher + Open/Start, New Project modal (folder browser + install options + composer flow), PWA install + notifications, liveness + refresh, security model
- [ ] `guides/multi-project-master.md` rewritten to the hub switcher workflow (single origin, PWA, LAN/mobile)
- [ ] Mobile/PWA + `INSIGHT_FLOW_TRUSTED_HOSTS` (from N223) + trust boundary documented
- [ ] `bulk-*` positioned as **legacy**; hub is the primary multi-project path
- [ ] `dashboard/index.md`, `cli/setup-and-dashboard.md`, root `README.md` corrected + consistent
- [ ] No stale claims remain (no "in-memory registry" / `prompt` / "run in its folder to open")

## Quality gates

- [ ] Docusaurus site builds clean (no broken-link / frontmatter errors)
- [ ] `npm run lint` passes (if any code/config touched — likely none)
- [ ] No stale command names / ports / env keys (`6100`, `6006/6007`, `INSIGHT_FLOW_BROWSE_ROOT`, `INSIGHT_FLOW_PROJECTS_HOME`, `INSIGHT_FLOW_TRUSTED_HOSTS`)
- [ ] Every claim verified against the shipped code

## Verification

- [ ] Grep the two rewritten docs → none of the stale phrases; all new features present
- [ ] `bulk-*` labeled legacy
- [ ] `cd website && pnpm build` (docusaurus) succeeds
- [ ] Fresh-reader skim matches the running hub (Start, Open `/project/<id>/`, New Project, PWA install, mobile via trusted host)
