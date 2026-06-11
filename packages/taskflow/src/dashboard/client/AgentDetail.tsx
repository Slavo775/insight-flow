// N93 — agent detail: pretty header + the interactive composition map.
// The agent's ordered modules (sequence-numbered, kind-colored) flow into the
// agent node; clicking a module node opens /module/<id>.
import styled, { useTheme } from "styled-components";
import type { AgentDto } from "./api.js";
import { CompositionMap, kindColor, type MapNodeSpec } from "./components/CompositionMap.js";

const Header = styled.div`
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

const Title = styled.h2`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size["2xl"]};
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

export function AgentDetail({ agent }: { agent: AgentDto }) {
  const theme = useTheme();

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

  return (
    <>
      <Header>
        <Title>⚙ {agent.title}</Title>
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
      <CompositionMap nodes={nodes} edges={edges} />
    </>
  );
}
