// N109 — the editable flow canvas for custom flows: draggable nodes whose
// positions report up for persistence into the flow definition's `layout`
// field. Edges render read-only here; connect/disconnect arrives with N110.
import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import styled, { useTheme } from "styled-components";
import type { ProjectDto } from "../api.js";
import { computePositions } from "./FlowMap.js";

const EditBox = styled.div`
  height: 620px;
  background: ${(p) => p.theme.color.surface};
  border: 1px dashed ${(p) => p.theme.color.accent};
  border-radius: ${(p) => p.theme.radius.xl};
  overflow: hidden;

  @media (max-width: 768px) {
    height: 70vh;
  }
`;

export type FlowPositions = Record<string, { x: number; y: number }>;

export function FlowEditor({
  project,
  onPositionsChange,
}: {
  project: ProjectDto;
  /** Fired after every drag stop with the full current position map. */
  onPositionsChange: (positions: FlowPositions) => void;
}) {
  const theme = useTheme();

  const initialNodes: Node[] = useMemo(() => {
    const positions = computePositions(project);
    return project.agents.map((a) => ({
      id: a,
      position: positions[a],
      data: { label: `⚙ ${project.agentTitles[a] ?? a}` },
      style: {
        background: theme.color.bg,
        color: theme.color.text,
        border: `1px solid ${theme.color.accent}`,
        borderRadius: theme.radius.xl,
        fontFamily: theme.font.family,
        fontSize: theme.font.size.md,
        padding: "10px 14px",
        width: 220,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
    // The editor seeds once per project identity — live edits own the state,
    // so theme/title changes intentionally don't re-seed dragged positions.
  }, [project.id]); // eslint-disable-line

  const [nodes, , onNodesChange] = useNodesState(initialNodes);

  const edges: Edge[] = useMemo(
    () =>
      project.flow.map((e) => ({
        id: `${e.from}->${e.to}:${e.on ?? "handoff"}`,
        source: e.from,
        target: e.to,
        label: e.on ?? "",
        labelStyle: { fill: theme.color.textMuted, fontFamily: theme.font.family, fontSize: 10 },
        labelBgStyle: { fill: theme.color.surface },
        style: { stroke: theme.color.border },
      })),
    [project, theme],
  );

  const reportPositions = useCallback(
    (currentNodes: Node[]): void => {
      const positions: FlowPositions = {};
      for (const node of currentNodes) {
        positions[node.id] = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
      }
      onPositionsChange(positions);
    },
    [onPositionsChange],
  );

  return (
    <EditBox>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={() => reportPositions(nodes)}
        fitView
        minZoom={0.2}
        nodesConnectable={false}
        nodesDraggable
        colorMode="dark"
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </EditBox>
  );
}
