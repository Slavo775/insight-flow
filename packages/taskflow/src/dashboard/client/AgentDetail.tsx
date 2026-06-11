// N93 — agent detail: pretty header (+ description) and the interactive
// composition map. Change request R1: clicking a module node opens an info
// modal in place (no navigation); the modal links to the full module page.
import { useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import type { AgentDto } from "./api.js";
import { CompositionMap, kindColor, type MapNodeSpec } from "./components/CompositionMap.js";
import { ModuleInfoModal } from "./components/ModuleInfoModal.js";
import type { Registry } from "./registry.js";

const Header = styled.div`
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

const Title = styled.h2`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size["2xl"]};
  margin: 0 0 ${(p) => p.theme.space.sm};
`;

const Description = styled.p`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.md};
  margin: 0 0 ${(p) => p.theme.space.sm};
`;

const Sub = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.sm};
  margin: 0;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(p) => p.theme.space["2xl"]};
  margin: ${(p) => p.theme.space.lg} 0 ${(p) => p.theme.space["2xl"]};
`;

const LegendItem = styled.span<{ $color: string }>`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.xs};

  &::before {
    content: "● ";
    color: ${(p) => p.$color};
  }
`;

const KINDS = ["section", "include", "mcp-server", "hook", "skill"] as const;

export function AgentDetail({ agent, registry }: { agent: AgentDto; registry: Registry }) {
  const theme = useTheme();
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const nodes: MapNodeSpec[] = [
    ...agent.modules.map((m, i) => ({
      id: m.id,
      label: `${i + 1}. ${m.title}`,
      kind: m.kind,
      role: "module" as const,
    })),
    {
      id: `agent:${agent.id}`,
      label: `⚙ ${agent.title}`,
      kind: "agent",
      role: "agent",
      emphasis: true,
    },
  ];
  const edges: [string, string][] = agent.modules.map((m) => [m.id, `agent:${agent.id}`]);

  const usedKinds = KINDS.filter((k) => agent.modules.some((m) => m.kind === k));
  const sharedCount = agent.modules.filter((m) => !m.id.includes("/")).length;

  const openModule = useMemo(
    () => (openModuleId ? (registry.modules.find((m) => m.id === openModuleId) ?? null) : null),
    [openModuleId, registry],
  );

  return (
    <>
      <Header>
        <Title>⚙ {agent.title}</Title>
        {agent.description ? <Description>{agent.description}</Description> : null}
        <Sub>
          {agent.id} · {agent.modules.length} modules in sequence · {sharedCount} shared
        </Sub>
      </Header>
      <Legend>
        {usedKinds.map((k) => (
          <LegendItem key={k} $color={kindColor(theme, k)}>
            {k}
          </LegendItem>
        ))}
      </Legend>
      <CompositionMap nodes={nodes} edges={edges} onModuleClick={setOpenModuleId} />
      {openModule ? (
        <ModuleInfoModal module={openModule} onClose={() => setOpenModuleId(null)} />
      ) : null}
    </>
  );
}
