// N96 — /project: the atomic-design top layer. Sidebar lists the project's
// agents (links) and the global install (module links); content shows the
// lifecycle flow map. N108 — multiple named flows: the sidebar lists every
// flow (shipped default badged), /project/:id deep-links, custom flows are
// deletable; the default stays the one the task maps bind to.
import { useEffect, useState } from "react";
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
import { SideLayout } from "./components/SideLayout.js";
import { kindColor } from "./components/CompositionMap.js";
import { KindDot, MenuLink } from "./ModulesPage.js";
import { TASK_STATUSES } from "../../core/statuses.js";
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
    setDraft({ positions: { ...(project.layout ?? {}) }, flow: project.flow });
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
      // PUT the full flow record — layout + edges from the draft; everything
      // else carried verbatim so the server's whole-record validation holds.
      const record = {
        id: project.id,
        title: project.title,
        ...(project.description ? { description: project.description } : {}),
        agents: project.agents,
        flow: draft.flow,
        install: project.install,
        layout: draft.positions,
        states: draftStates,
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
        <GroupTitle>Agents</GroupTitle>
        {project.agents.map((a) => (
          <MenuLink key={a} to={`/agent/${a}`}>
            ⚙ {project.agentTitles[a] ?? a}
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
          <SourceBadge $builtin={isBuiltin}>{isBuiltin ? "shipped" : "custom"}</SourceBadge>
          {!isBuiltin && !editing ? (
            <>
              <Button type="button" $variant="nav" onClick={startEdit}>
                Edit flow
              </Button>
              <Button type="button" $variant="danger" onClick={() => void removeFlow()}>
                Delete flow
              </Button>
            </>
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
              onDraftChange={(next) => {
                setDraft(next);
                setDirty(true);
              }}
            />
          </>
        ) : (
          <FlowMap project={project} />
        )}
        {!isBuiltin && !editing ? (
          <Hint>
            Edit layout to drag nodes and wire edges (outputs leave right, inputs enter left; pick
            the trigger when connecting). <Link to="/project/new">Duplicate from default</Link> is
            the quickest start for a new flow.
          </Hint>
        ) : null}
      </SideLayout>
    </>
  );
}
