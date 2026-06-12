// N96 — the project flow map: agents as nodes, lifecycle edges labeled with
// their status/verdict triggers. Layout: BFS layering from the flow's roots
// (no incoming edges); agents outside the flow sit in a trailing column.
// Clicking an agent navigates to /agent/:id. Read-only this iteration.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Background, Controls, MiniMap, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import styled, { useTheme } from "styled-components";
import type { ProjectDto } from "../api.js";

const MapBox = styled.div`
  height: 620px;
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  overflow: hidden;

  @media (max-width: 768px) {
    height: 70vh;
  }
`;

/** Column per BFS depth from the roots; isolated agents go last. */
function layerAgents(project: ProjectDto): Map<string, number> {
  const inFlow = new Set(project.flow.flatMap((e) => [e.from, e.to]));
  const incoming = new Map<string, number>();
  for (const e of project.flow) incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);

  const depth = new Map<string, number>();
  let frontier = project.agents.filter((a) => inFlow.has(a) && !incoming.has(a));
  if (!frontier.length && inFlow.size) frontier = [project.flow[0].from];
  frontier.forEach((a) => depth.set(a, 0));
  let guard = 0;
  while (frontier.length && guard++ < 32) {
    const next: string[] = [];
    for (const e of project.flow) {
      if (frontier.includes(e.from) && !depth.has(e.to)) {
        depth.set(e.to, (depth.get(e.from) ?? 0) + 1);
        next.push(e.to);
      }
    }
    frontier = next;
  }
  const maxDepth = Math.max(0, ...depth.values());
  for (const a of project.agents) {
    if (!depth.has(a)) depth.set(a, maxDepth + 1);
  }
  return depth;
}

export function FlowMap({
  project,
  highlightNodes,
  secondaryHighlightNodes,
}: {
  project: ProjectDto;
  /** N104: node ids rendered with the "task is here" accent (📍 badge). */
  highlightNodes?: string[];
  /** N105: suggested next agents — dashed accent (▶ badge). */
  secondaryHighlightNodes?: string[];
}) {
  const theme = useTheme();
  const navigate = useNavigate();

  const { nodes, edges } = useMemo(() => {
    const depth = layerAgents(project);
    const byColumn = new Map<number, string[]>();
    for (const a of project.agents) {
      const col = depth.get(a) ?? 0;
      (byColumn.get(col) ?? byColumn.set(col, []).get(col)!).push(a);
    }

    const COL_W = 280;
    const ROW_H = 110;
    const nodes: Node[] = project.agents.map((a) => {
      const col = depth.get(a) ?? 0;
      const siblings = byColumn.get(col) ?? [a];
      const row = siblings.indexOf(a);
      const isCurrent = highlightNodes?.includes(a) ?? false;
      const isSuggested = !isCurrent && (secondaryHighlightNodes?.includes(a) ?? false);
      const badge = isCurrent ? "📍 " : isSuggested ? "▶ " : "";
      return {
        id: a,
        position: { x: col * COL_W, y: row * ROW_H },
        data: { label: `${badge}⚙ ${project.agentTitles[a] ?? a}` },
        style: {
          background: isCurrent ? `${theme.color.accent}2e` : theme.color.bg,
          color: theme.color.text,
          border: isCurrent
            ? `2px solid ${theme.color.accent}`
            : isSuggested
              ? `2px dashed ${theme.color.accent}`
              : `1px solid ${theme.color.accent}`,
          borderRadius: theme.radius.xl,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.md,
          padding: "10px 14px",
          width: 220,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const edges: Edge[] = project.flow.map((e) => ({
      id: `${e.from}->${e.to}:${e.on ?? "handoff"}`,
      source: e.from,
      target: e.to,
      animated: true,
      label: e.on ?? "",
      labelStyle: { fill: theme.color.textMuted, fontFamily: theme.font.family, fontSize: 10 },
      labelBgStyle: { fill: theme.color.surface },
      style: { stroke: theme.color.border },
    }));

    return { nodes, edges };
  }, [project, theme, highlightNodes, secondaryHighlightNodes]);

  return (
    <MapBox>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.2}
        nodesConnectable={false}
        nodesDraggable
        onNodeClick={(_, node) => navigate(`/agent/${node.id}`)}
        colorMode="dark"
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
        {typeof window !== "undefined" && window.innerWidth > 768 ? (
          <MiniMap pannable zoomable />
        ) : null}
      </ReactFlow>
    </MapBox>
  );
}
