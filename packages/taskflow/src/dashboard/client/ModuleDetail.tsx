// N93 — module detail: everything about one registry module. Kind badge +
// source, kind-specific panels (section body, include ref, MCP config JSON,
// hook table, skill content), referencing-agent chips, and an interactive map
// (module ←→ its facet + referencing agents).
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import type { ModuleDto } from "./api.js";
import { CompositionMap, kindColor, type MapNodeSpec } from "./components/CompositionMap.js";
import type { Registry } from "./registry.js";

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${(p) => p.theme.space.lg};
  margin-bottom: ${(p) => p.theme.space.lg};
`;

const Title = styled.h2`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size["2xl"]};
  margin: 0;
`;

const Badge = styled.span<{ $color: string }>`
  border: 1px solid ${(p) => p.$color};
  color: ${(p) => p.$color};
  border-radius: ${(p) => p.theme.radius.pill};
  font-size: ${(p) => p.theme.font.size.xs};
  padding: 2px ${(p) => p.theme.space.lg};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const Muted = styled.span`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.sm};
`;

const Panel = styled.section`
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  padding: ${(p) => p.theme.space["2xl"]};
  margin-bottom: ${(p) => p.theme.space["2xl"]};
  min-width: 0;
`;

const PanelTitle = styled.h3`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.sm};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 ${(p) => p.theme.space.lg};
`;

const Pre = styled.pre`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.md};
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(p) => p.theme.space.lg};
`;

const Chip = styled(Link)`
  color: ${(p) => p.theme.color.accent};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.pill};
  text-decoration: none;
  font-size: ${(p) => p.theme.font.size.sm};
  padding: ${(p) => p.theme.space.sm} ${(p) => p.theme.space.xl};

  &:hover {
    border-color: ${(p) => p.theme.color.accent};
  }
`;

const KV = styled.dl`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: ${(p) => p.theme.space.md} ${(p) => p.theme.space["2xl"]};
  margin: 0;

  dt {
    color: ${(p) => p.theme.color.textMuted};
    font-size: ${(p) => p.theme.font.size.sm};
  }
  dd {
    color: ${(p) => p.theme.color.text};
    font-size: ${(p) => p.theme.font.size.md};
    margin: 0;
    word-break: break-word;
  }
`;

function KindPanels({ module }: { module: ModuleDto }) {
  switch (module.kind) {
    case "section":
      return (
        <>
          {module.heading ? (
            <Panel>
              <PanelTitle>Heading</PanelTitle>
              <Pre>{module.heading}</Pre>
            </Panel>
          ) : null}
          {module.body ? (
            <Panel>
              <PanelTitle>Body (prompt text)</PanelTitle>
              <Pre>{module.body}</Pre>
            </Panel>
          ) : null}
        </>
      );
    case "include":
      return (
        <Panel>
          <PanelTitle>Include reference</PanelTitle>
          <Pre>@{module.ref}</Pre>
        </Panel>
      );
    case "mcp-server":
      return (
        <Panel>
          <PanelTitle>MCP server — {module.name}</PanelTitle>
          <Pre>{JSON.stringify(module.config ?? {}, null, 2)}</Pre>
        </Panel>
      );
    case "hook":
      return (
        <Panel>
          <PanelTitle>Claude Code hook</PanelTitle>
          <KV>
            <dt>Event</dt>
            <dd>{module.event}</dd>
            <dt>Matcher</dt>
            <dd>{module.matcher ?? "(all tools)"}</dd>
            <dt>Command</dt>
            <dd>
              <Pre as="code">{module.command}</Pre>
            </dd>
          </KV>
        </Panel>
      );
    case "skill":
      return (
        <Panel>
          <PanelTitle>Skill — .claude/skills/{module.name}/SKILL.md</PanelTitle>
          <Pre>{module.content}</Pre>
        </Panel>
      );
    default:
      return null;
  }
}

function facetLabel(module: ModuleDto): string {
  switch (module.kind) {
    case "section":
      return module.heading ? `section “${module.heading}”` : "section (body only)";
    case "include":
      return `@${module.ref}`;
    case "mcp-server":
      return `.mcp.json → ${module.name}`;
    case "hook":
      return `${module.event} hook`;
    case "skill":
      return `skill: ${module.name}`;
    default:
      return module.kind;
  }
}

export function ModuleDetail({ module, registry }: { module: ModuleDto; registry: Registry }) {
  const theme = useTheme();
  const refs = registry.referencedBy[module.id] ?? [];
  const agentTitle = (id: string): string =>
    registry.agents.find((a) => a.id === id)?.title ?? id;

  const nodes: MapNodeSpec[] = [
    { id: module.id, label: module.title, kind: module.kind, role: "facet", emphasis: true },
    { id: `facet:${module.id}`, label: facetLabel(module), kind: module.kind, role: "facet" },
    ...refs.map((a) => ({
      id: `agent:${a}`,
      label: `⚙ ${agentTitle(a)}`,
      kind: "agent",
      role: "agent" as const,
    })),
  ];
  const edges: [string, string][] = [
    [`facet:${module.id}`, module.id],
    ...refs.map((a): [string, string] => [module.id, `agent:${a}`]),
  ];

  return (
    <>
      <Header>
        <Title>{module.title}</Title>
        <Badge $color={kindColor(theme, module.kind)}>{module.kind}</Badge>
        <Muted>
          {module.id} · {module.source}
        </Muted>
      </Header>

      <KindPanels module={module} />

      <Panel>
        <PanelTitle>Referenced by {refs.length} agent{refs.length === 1 ? "" : "s"}</PanelTitle>
        {refs.length ? (
          <Chips>
            {refs.map((a) => (
              <Chip key={a} to={`/agent/${a}`}>
                {agentTitle(a)}
              </Chip>
            ))}
          </Chips>
        ) : (
          <Muted>No composed agent references this module yet.</Muted>
        )}
      </Panel>

      <Panel>
        <PanelTitle>Map</PanelTitle>
        <CompositionMap nodes={nodes} edges={edges} />
      </Panel>
    </>
  );
}
