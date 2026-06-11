// N96 — /project: the atomic-design top layer. Sidebar lists the project's
// agents (links) and the global install (module links); content shows the
// lifecycle flow map. Read-only this iteration — the flow is descriptive;
// behavior is still enforced by the status machine / pickers / prompts.
import { useEffect, useState } from "react";
import styled from "styled-components";
import { fetchProject, type ProjectDto } from "./api.js";
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
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

const Title = styled.h2`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size["2xl"]};
  margin: 0 0 ${(p) => p.theme.space.sm};
`;

const Description = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.md};
  margin: 0;
`;

export function ProjectPage() {
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const projectName = useDashboardStore((s) => s.snapshot?.projectName || "");

  useEffect(() => {
    let alive = true;
    fetchProject().then(
      (p) => alive && setProject(p),
      (e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <Hint>Failed to load project: {error}</Hint>;
  if (!project) return <Hint>Loading project…</Hint>;

  const sidebar = (
    <>
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
        <Header>
          <Title>{project.title}</Title>
          {project.description ? <Description>{project.description}</Description> : null}
        </Header>
        <FlowMap project={project} />
      </SideLayout>
    </>
  );
}
