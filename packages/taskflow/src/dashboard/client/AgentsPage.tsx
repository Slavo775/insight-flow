// N93 — /agent and /agent/:id. Sidebar: the composed agents with pretty
// titles. Content: AgentDetail (header + interactive composition map).
import { Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { AgentDetail } from "./AgentDetail.js";
import { SideLayout } from "./components/SideLayout.js";
import { MenuLink } from "./ModulesPage.js";
import { useDashboardStore } from "./store.js";
import { useRegistry } from "./registry.js";
import { Nav } from "./ui.js";

const Hint = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  padding: ${(p) => p.theme.space["2xl"]};
`;

const AgentGlyph = styled.span`
  color: ${(p) => p.theme.color.accent};
`;

export function AgentsPage() {
  const { id } = useParams();
  const { registry, error } = useRegistry();
  const projectName = useDashboardStore((s) => s.snapshot?.projectName || "");

  if (error) return <Hint>Failed to load registry: {error}</Hint>;
  if (!registry) return <Hint>Loading registry…</Hint>;

  if (!id && registry.agents.length) {
    return <Navigate to={`/agent/${registry.agents[0].id}`} replace />;
  }

  const agent = registry.agents.find((a) => a.id === id) ?? null;

  const sidebar = registry.agents.map((a) => (
    <MenuLink key={a.id} to={`/agent/${a.id}`} title={a.description}>
      <AgentGlyph>⚙</AgentGlyph> {a.title}
    </MenuLink>
  ));

  return (
    <>
      <Nav projectName={projectName} />
      <SideLayout title="Agents" sidebar={sidebar}>
        {agent ? (
          <AgentDetail agent={agent} registry={registry} />
        ) : (
          <Hint>Unknown agent “{id}”.</Hint>
        )}
      </SideLayout>
    </>
  );
}
