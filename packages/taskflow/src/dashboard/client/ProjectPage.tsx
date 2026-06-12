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
import { FlowEditor, type FlowPositions } from "./components/FlowEditor.js";
import { FlowMap } from "./components/FlowMap.js";
import { SideLayout } from "./components/SideLayout.js";
import { kindColor } from "./components/CompositionMap.js";
import { KindDot, MenuLink } from "./ModulesPage.js";
import { tokens } from "./theme.js";
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

export function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummaryDto[] | null>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  // N109 — layout edit mode (custom flows only): draft positions live here
  // until an explicit Save; null = not editing.
  const [draftPositions, setDraftPositions] = useState<FlowPositions | null>(null);
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
    setDraftPositions(null);
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
  const editing = draftPositions !== null;

  const startEdit = (): void => {
    setDraftPositions({ ...(project.layout ?? {}) });
    setDirty(false);
  };

  const exitEdit = (): void => {
    if (dirty && !window.confirm("Discard unsaved layout changes?")) return;
    setDraftPositions(null);
    setDirty(false);
  };

  const saveLayout = async (): Promise<void> => {
    if (!draftPositions) return;
    setTopError(null);
    setBusy(true);
    try {
      // PUT the full flow record — only `layout` changes; everything else is
      // carried verbatim so the server's whole-record validation holds.
      const record = {
        id: project.id,
        title: project.title,
        ...(project.description ? { description: project.description } : {}),
        agents: project.agents,
        flow: project.flow,
        install: project.install,
        layout: draftPositions,
      };
      await saveDefinition("projects", record, true);
      // Re-render from server truth.
      const fresh = await fetchProject(project.id);
      setProject(fresh);
      setDraftPositions(null);
      setDirty(false);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : String(err));
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
                Edit layout
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
                onClick={() => void saveLayout()}
              >
                Save layout
              </Button>
              <Button type="button" $variant="nav" disabled={busy} onClick={exitEdit}>
                {dirty ? "Discard" : "Done"}
              </Button>
            </>
          ) : null}
        </Header>
        {project.description ? <Description>{project.description}</Description> : null}
        {editing ? (
          <FlowEditor
            project={project}
            onPositionsChange={(positions) => {
              setDraftPositions(positions);
              setDirty(true);
            }}
          />
        ) : (
          <FlowMap project={project} />
        )}
        {!isBuiltin && !editing ? (
          <Hint>
            Drag nodes via Edit layout; edge editing lands with N110–N111.{" "}
            <Link to="/project/new">Duplicate from default</Link> is the quickest start for a new
            flow.
          </Hint>
        ) : null}
      </SideLayout>
    </>
  );
}
