// N93 — /module and /module/* (splat: module ids contain "/", e.g.
// "task-implement/never"). Sidebar: all registry modules grouped shared /
// per-role / integrations. Content: ModuleDetail for the selected id.
import { Navigate, NavLink, useParams } from "react-router-dom";
import styled from "styled-components";
import { tokens } from "./theme.js";
import { useDashboardStore } from "./store.js";
import { ModuleDetail } from "./ModuleDetail.js";
import { SideLayout } from "./components/SideLayout.js";
import { kindColor } from "./components/CompositionMap.js";
import { useRegistry, type Registry } from "./registry.js";
import { Nav } from "./ui.js";

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

export const MenuLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  color: ${(p) => p.theme.color.text};
  text-decoration: none;
  font-size: ${(p) => p.theme.font.size.md};
  padding: ${(p) => p.theme.space.md} ${(p) => p.theme.space.lg};
  border-radius: ${(p) => p.theme.radius.lg};

  &:hover {
    background: ${(p) => p.theme.color.border};
  }
  &.active {
    background: ${(p) => p.theme.color.border};
    color: ${(p) => p.theme.color.accent};
  }
`;

export const KindDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: ${(p) => p.theme.radius.pill};
  background: ${(p) => p.$color};
`;

const Hint = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  padding: ${(p) => p.theme.space["2xl"]};
`;

function groupModules(registry: Registry): { title: string; ids: string[] }[] {
  const shared: string[] = [];
  const byPrefix = new Map<string, string[]>();
  const agentIds = new Set(registry.agents.map((a) => a.id));
  for (const m of registry.modules) {
    const slash = m.id.indexOf("/");
    if (slash === -1) {
      shared.push(m.id);
      continue;
    }
    const prefix = m.id.slice(0, slash);
    const list = byPrefix.get(prefix) ?? [];
    list.push(m.id);
    byPrefix.set(prefix, list);
  }
  const roles = [...byPrefix.entries()].filter(([p]) => agentIds.has(p));
  const integrations = [...byPrefix.entries()].filter(([p]) => !agentIds.has(p));
  return [
    { title: "Shared", ids: shared },
    ...integrations.map(([p, ids]) => ({ title: `Integration: ${p}`, ids })),
    ...roles.map(([p, ids]) => ({ title: p, ids })),
  ].filter((g) => g.ids.length);
}

export function ModulesPage() {
  const params = useParams();
  const moduleId = params["*"] || null;
  const { registry, error } = useRegistry();
  const projectName = useDashboardStore((s) => s.snapshot?.projectName || "");

  if (error) return <Hint>Failed to load registry: {error}</Hint>;
  if (!registry) return <Hint>Loading registry…</Hint>;

  if (!moduleId && registry.modules.length) {
    return <Navigate to={`/module/${registry.modules[0].id}`} replace />;
  }

  const byId = new Map(registry.modules.map((m) => [m.id, m]));
  const selected = moduleId ? (byId.get(moduleId) ?? null) : null;

  const sidebar = groupModules(registry).map((group) => (
    <Group key={group.title}>
      <GroupTitle>{group.title}</GroupTitle>
      {group.ids.map((id) => {
        const m = byId.get(id);
        if (!m) return null;
        return (
          <MenuLink key={id} to={`/module/${id}`}>
            <KindDot $color={kindColor(tokens, m.kind)} />
            {m.id}
          </MenuLink>
        );
      })}
    </Group>
  ));

  return (
    <>
      <Nav projectName={projectName} />
      <SideLayout title="Modules" sidebar={sidebar}>
        {selected ? (
          <ModuleDetail module={selected} registry={registry} />
        ) : (
          <Hint>Unknown module “{moduleId}”.</Hint>
        )}
      </SideLayout>
    </>
  );
}

