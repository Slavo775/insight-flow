// N96 — /project: the atomic-design top layer. Sidebar lists the project's
// agents (links) and the global install (module links); content shows the
// lifecycle flow map. N108 — multiple named flows: the sidebar lists every
// flow (shipped default badged), /project/:id deep-links, custom flows are
// deletable; the default stays the one the task maps bind to.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  ApiError,
  deleteDefinition,
  fetchProject,
  fetchProjects,
  saveDefinition,
  type ProjectDto,
  type ProjectSummaryDto,
} from "./api.js";
import { Button } from "./components/index.js";
import { FlowEditor, type FlowDraft } from "./components/FlowEditor.js";
import { FlowMap } from "./components/FlowMap.js";
import { InstallModal } from "./components/InstallModal.js";
import { SideLayout } from "./components/SideLayout.js";
import { kindColor } from "./components/CompositionMap.js";
import { KindDot, MenuLink } from "./ModulesPage.js";
import { useRegistry } from "./registry.js";
import { TASK_STATUSES } from "../../core/statuses.js";
import type { AgentHandover } from "../../core/flow-status.js";
import { tokens } from "./theme.js";

const TASK_STATUS_OPTIONS: readonly string[] = TASK_STATUSES;
import { useDashboardStore } from "./store.js";
import { Nav } from "./ui.js";

const Hint = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  padding: ${(p) => p.theme.space["2xl"]};
`;

const Group = styled.div`
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

const GroupTitle = styled.div`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.xs};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: ${(p) => p.theme.space.md};
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${(p) => p.theme.space.lg};
  margin-bottom: ${(p) => p.theme.space.sm};
`;

const Title = styled.h2`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size["2xl"]};
  margin: 0;
`;

const Description = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.md};
  margin: 0 0 ${(p) => p.theme.space["2xl"]};
`;

const SourceBadge = styled.span<{ $builtin: boolean }>`
  border: 1px solid ${(p) => (p.$builtin ? p.theme.color.accent : p.theme.color.amber)};
  color: ${(p) => (p.$builtin ? p.theme.color.accent : p.theme.color.amber)};
  border-radius: ${(p) => p.theme.radius.pill};
  font-size: ${(p) => p.theme.font.size.xs};
  padding: 2px ${(p) => p.theme.space.lg};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const TopError = styled.div`
  border: 1px solid ${(p) => p.theme.color.red};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md};
  margin-bottom: ${(p) => p.theme.space.lg};
  font-size: ${(p) => p.theme.font.size.sm};
`;

// N112 — minimal custom-states list editor shown in flow-edit mode.
const StatesPanel = styled.div`
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.lg};
  margin-bottom: ${(p) => p.theme.space.lg};
`;

const StateRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  margin-bottom: ${(p) => p.theme.space.sm};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.text};

  input,
  select {
    background: ${(p) => p.theme.color.bg};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.md};
    padding: 4px 8px;
    font-family: ${(p) => p.theme.font.family};
    font-size: ${(p) => p.theme.font.size.sm};
  }
`;

export function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { registry } = useRegistry(); // N114 — agents for the editor's Add palette
  // N144 — each agent's declared handovers, joined from the registry (the
  // AgentModuleRef carries `kind` but not the handover fields, so look the full
  // module up by id). Drives the flow map's auto/gated badges + orphan warnings.
  const handoversByAgent = useMemo<Record<string, AgentHandover[]>>(() => {
    if (!registry) return {};
    const byId = new Map(registry.modules.map((m) => [m.id, m]));
    const out: Record<string, AgentHandover[]> = {};
    for (const agent of registry.agents) {
      const list: AgentHandover[] = [];
      for (const ref of agent.modules) {
        if (ref.kind !== "handover") continue;
        const mod = byId.get(ref.id);
        if (mod?.to) list.push({ to: mod.to, on: mod.on, mode: mod.mode ?? "gated" });
      }
      if (list.length) out[agent.id] = list;
    }
    return out;
  }, [registry]);
  // N146 — built-in/locked agents: their handovers can't be edited, so an
  // unbacked edge from one of these is informational ("not backed (built-in)"),
  // not a fixable orphan. `AgentDto.source` is "custom" for user agents.
  const builtinAgents = useMemo<Set<string>>(
    () => new Set((registry?.agents ?? []).filter((a) => a.source !== "custom").map((a) => a.id)),
    [registry],
  );
  const [projects, setProjects] = useState<ProjectSummaryDto[] | null>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  // N109/N110 — flow edit mode (custom flows only): the draft (positions +
  // edges) lives here until an explicit Save; null = not editing.
  const [draft, setDraft] = useState<FlowDraft | null>(null);
  // N112 — the draft's custom states (aliases onto canonical statuses).
  const [draftStates, setDraftStates] = useState<
    { id: string; title: string; color?: string; mapsTo: string }[]
  >([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  // N127 — the "Install this flow" modal (plan + live progress); null = closed.
  const [installing, setInstalling] = useState(false);
  const projectName = useDashboardStore((s) => s.snapshot?.projectName || "");

  useEffect(() => {
    let alive = true;
    fetchProjects().then(
      (list) => alive && setProjects(list),
      (e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setProject(null);
    setDraft(null);
    setDirty(false);
    fetchProject(id).then(
      (p) => alive && setProject(p),
      (e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) return <Hint>Failed to load project: {error}</Hint>;
  if (!projects || !project) return <Hint>Loading project…</Hint>;

  const isBuiltin = project.source !== "custom";
  const editing = draft !== null;

  const startEdit = (): void => {
    setDraft({
      agents: project.agents,
      positions: { ...(project.layout ?? {}) },
      flow: project.flow,
      // N134 — seed the draft's start points from the saved flow.
      entryAgents: project.entryAgents ?? [],
    });
    setDraftStates(project.states ?? []);
    setDirty(false);
  };

  const exitEdit = (): void => {
    if (dirty && !window.confirm("Discard unsaved flow changes?")) return;
    setDraft(null);
    setDirty(false);
  };

  // N111 — map server Zod issue paths ("flow.3.on") onto the draft's edges so
  // the error panel names the offending connection instead of a JSON path.
  const describeIssues = (issues: { path: string; message: string }[]): string =>
    issues
      .map((issue) => {
        const m = issue.path.match(/^flow\.(\d+)/);
        if (m && draft) {
          const edge = draft.flow[Number(m[1])];
          if (edge) {
            return `edge ${edge.from} → ${edge.to} (${edge.on ?? "handoff"}): ${issue.message}`;
          }
        }
        return `${issue.path}: ${issue.message}`;
      })
      .join(" · ");

  const saveDraft = async (): Promise<void> => {
    if (!draft) return;
    setTopError(null);
    setBusy(true);
    try {
      // PUT the full flow record — agents + layout + edges from the draft
      // (N114 the agent set is editable too); everything else carried verbatim
      // so the server's whole-record validation holds.
      const record = {
        id: project.id,
        title: project.title,
        ...(project.description ? { description: project.description } : {}),
        agents: draft.agents,
        flow: draft.flow,
        install: project.install,
        layout: draft.positions,
        states: draftStates,
        // N134 — persist the draft's start-point toggles, kept to the current
        // agent set so a removed agent can't remain an entry (was N122 verbatim).
        entryAgents: draft.entryAgents.filter((a) => draft.agents.includes(a)),
      };
      await saveDefinition("projects", record, true, { revision: project.revision });
      // Re-render from server truth.
      const fresh = await fetchProject(project.id);
      setProject(fresh);
      setDraft(null);
      setDirty(false);
    } catch (err) {
      // Validation/stale failures keep the draft so the user can fix and retry.
      if (err instanceof ApiError && err.status === 409 && /stale revision/.test(err.message)) {
        if (window.confirm("This flow changed on the server. Reload it (discarding your edits)?")) {
          const fresh = await fetchProject(project.id);
          setProject(fresh);
          setDraft(null);
          setDirty(false);
        } else {
          setTopError("Stale revision — your edits are preserved; reload to save.");
        }
      } else if (err instanceof ApiError && err.issues?.length) {
        setTopError(`Validation failed: ${describeIssues(err.issues)}`);
      } else {
        setTopError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const removeFlow = async (): Promise<void> => {
    if (!window.confirm(`Delete flow ${project.id}?`)) return;
    setTopError(null);
    try {
      await deleteDefinition("projects", project.id);
      navigate("/project");
    } catch (err) {
      if (err instanceof ApiError && err.referencedBy?.length) {
        setTopError(`Still referenced by: ${err.referencedBy.join(", ")}.`);
      } else {
        setTopError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  // N121 — revert the ejected default flow to its shipped version (DELETE the
  // override; the id stays, falling back to the package default).
  const revertFlow = async (): Promise<void> => {
    if (!window.confirm("Revert the default flow to the shipped version?")) return;
    setTopError(null);
    try {
      await deleteDefinition("projects", project.id);
      const fresh = await fetchProject(project.id);
      setProject(fresh);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : String(err));
    }
  };

  const sidebar = (
    <>
      <Group>
        <GroupTitle>Flows</GroupTitle>
        {projects.map((p) => (
          <MenuLink
            key={p.id}
            to={p.id === "default" ? "/project" : `/project/${p.id}`}
            title={p.description}
            className={p.id === project.id ? "active" : undefined}
          >
            ⛓ {p.title} {p.source === "builtin" ? "· shipped" : ""}
          </MenuLink>
        ))}
        <MenuLink to="/project/new">＋ New flow</MenuLink>
      </Group>
      <Group>
        <GroupTitle>
          Agents
          {(project.entryAgents?.length ?? 0) === 0 ? " (no start point — pick by type only)" : ""}
        </GroupTitle>
        {project.agents.map((a) => (
          <MenuLink key={a} to={`/agent/${a}`}>
            {project.entryAgents?.includes(a) ? "★" : "⚙"} {project.agentTitles[a] ?? a}
            {project.entryAgents?.includes(a) ? " · start point" : ""}
          </MenuLink>
        ))}
      </Group>
      <Group>
        <GroupTitle>Installed in this project</GroupTitle>
        {project.installModules.map((m) => (
          <MenuLink key={m.id} to={`/module/${m.id}`}>
            <KindDot $color={kindColor(tokens, m.kind)} />
            {m.id}
          </MenuLink>
        ))}
      </Group>
    </>
  );

  return (
    <>
      <Nav projectName={projectName} />
      <SideLayout title="Project" sidebar={sidebar}>
        {topError ? <TopError role="alert">{topError}</TopError> : null}
        <Header>
          <Title>{project.title}</Title>
          <SourceBadge $builtin={isBuiltin}>
            {isBuiltin ? (project.ejected ? "shipped · ejected" : "shipped") : "custom"}
          </SourceBadge>
          {/* N121 — every flow is editable now (the default ejects on save). */}
          {!editing ? (
            <Button type="button" $variant="nav" onClick={startEdit}>
              Edit flow
            </Button>
          ) : null}
          {/* N127 — install this flow's artifacts (mcp/hooks/skills) here. */}
          {!editing ? (
            <Button type="button" $variant="primary" onClick={() => setInstalling(true)}>
              Install this flow
            </Button>
          ) : null}
          {/* Custom flows delete; an ejected default reverts to shipped. */}
          {!isBuiltin && !editing ? (
            <Button type="button" $variant="danger" onClick={() => void removeFlow()}>
              Delete flow
            </Button>
          ) : null}
          {isBuiltin && project.ejected && !editing ? (
            <Button type="button" $variant="danger" onClick={() => void revertFlow()}>
              Revert to shipped
            </Button>
          ) : null}
          {editing ? (
            <>
              <Button
                type="button"
                $variant="primary"
                disabled={busy || !dirty}
                onClick={() => void saveDraft()}
              >
                Save flow
              </Button>
              <Button type="button" $variant="nav" disabled={busy} onClick={exitEdit}>
                {dirty ? "Discard" : "Done"}
              </Button>
            </>
          ) : null}
        </Header>
        {project.description ? <Description>{project.description}</Description> : null}
        {editing ? (
          <>
            <StatesPanel>
              <GroupTitle>Custom states (alias → canonical status)</GroupTitle>
              {draftStates.map((state, i) => {
                const inUse = (draft?.flow ?? project.flow).some((e) => e.on === state.id);
                const update = (
                  patch: Partial<{ id: string; title: string; color?: string; mapsTo: string }>,
                ): void => {
                  setDraftStates(draftStates.map((s, j) => (j === i ? { ...s, ...patch } : s)));
                  setDirty(true);
                };
                return (
                  <StateRow key={i}>
                    <input
                      value={state.id}
                      placeholder="qa-verify"
                      disabled={inUse}
                      title={inUse ? "id locked while edges use this state" : "state id"}
                      onChange={(e) => update({ id: e.target.value })}
                    />
                    <input
                      value={state.title}
                      placeholder="Title"
                      onChange={(e) => update({ title: e.target.value })}
                    />
                    <input
                      value={state.color ?? ""}
                      placeholder="#a78bfa"
                      style={{ width: 90 }}
                      onChange={(e) => update({ color: e.target.value || undefined })}
                    />
                    →
                    <select
                      value={state.mapsTo}
                      onChange={(e) => update({ mapsTo: e.target.value })}
                    >
                      {TASK_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      $variant="nav"
                      disabled={inUse}
                      title={inUse ? "remove the edges using this state first" : "remove"}
                      onClick={() => {
                        setDraftStates(draftStates.filter((_, j) => j !== i));
                        setDirty(true);
                      }}
                    >
                      ✕
                    </Button>
                  </StateRow>
                );
              })}
              <Button
                type="button"
                $variant="nav"
                onClick={() => {
                  setDraftStates([...draftStates, { id: "", title: "", mapsTo: "approved" }]);
                  setDirty(true);
                }}
              >
                ＋ Add state
              </Button>
            </StatesPanel>
            <FlowEditor
              project={project}
              states={draftStates.filter((s) => s.id && s.title)}
              allAgents={registry?.agents ?? []}
              handoversByAgent={handoversByAgent}
              builtinAgents={builtinAgents}
              onDraftChange={(next) => {
                setDraft(next);
                setDirty(true);
              }}
            />
          </>
        ) : (
          <FlowMap
            project={project}
            handoversByAgent={handoversByAgent}
            builtinAgents={builtinAgents}
          />
        )}
        {!isBuiltin && !editing ? (
          <Hint>
            Edit layout to drag nodes and wire edges (outputs leave right, inputs enter left; pick
            the trigger when connecting). <Link to="/project/new">Duplicate from default</Link> is
            the quickest start for a new flow.
          </Hint>
        ) : null}
      </SideLayout>
      {installing ? (
        <InstallModal
          flowId={project.id}
          flowTitle={project.title}
          onClose={() => setInstalling(false)}
        />
      ) : null}
    </>
  );
}
