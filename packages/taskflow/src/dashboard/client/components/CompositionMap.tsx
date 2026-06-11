// N93 — interactive composition map (React Flow). Two variants:
//   - agent map: the agent's ordered modules (kind-colored, sequence-numbered)
//     flowing into the agent node; module nodes navigate to /module/<id>.
//   - module map: the module centered, its kind facet on one side and the
//     referencing agents on the other; agent nodes navigate to /agent/<id>.
// Touch-ready (pan/pinch ship with React Flow), fitView on load, minimap only
// on viewports wider than the mobile breakpoint.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Background,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import styled, { useTheme } from "styled-components";
import type { Theme } from "../theme.js";

const MapBox = styled.div`
  height: 560px;
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  overflow: hidden;

  @media (max-width: 768px) {
    height: 70vh;
  }

  .react-flow__attribution {
    background: transparent;
    color: ${(p) => p.theme.color.textMuted};
  }
`;

export function kindColor(theme: Theme, kind: string): string {
  switch (kind) {
    case "section":
      return theme.color.cyan;
    case "include":
      return theme.color.purple;
    case "mcp-server":
      return theme.color.orange;
    case "hook":
      return theme.color.yellow;
    case "skill":
      return theme.color.green;
    default:
      return theme.color.textMuted;
  }
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent): void => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

function nodeStyle(theme: Theme, color: string, emphasis = false): React.CSSProperties {
  return {
    background: theme.color.bg,
    color: theme.color.text,
    border: `${emphasis ? 2 : 1}px solid ${color}`,
    borderRadius: theme.radius.xl,
    fontFamily: theme.font.family,
    fontSize: emphasis ? theme.font.size.md : theme.font.size.base,
    padding: "8px 12px",
    width: 220,
  };
}

export interface MapNodeSpec {
  /** React Flow node id; also the navigation target key. */
  id: string;
  label: string;
  kind: string;
  /** "module" | "agent" | "facet" — decides click navigation. */
  role: "module" | "agent" | "facet";
  emphasis?: boolean;
}

export function CompositionMap({
  nodes: specs,
  /** Directed pairs [fromId, toId]. */
  edges: pairs,
  /** Layout: left column = all non-emphasis nodes, right = emphasis node(s). */
  direction = "fan-in",
}: {
  nodes: MapNodeSpec[];
  edges: [string, string][];
  direction?: "fan-in" | "fan-out";
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { nodes, edges } = useMemo(() => {
    const left = specs.filter((s) => !s.emphasis);
    const right = specs.filter((s) => s.emphasis);
    const ROW = 78;
    const leftX = 0;
    const rightX = isMobile ? 300 : 420;
    const centerY = Math.max(0, ((left.length - 1) * ROW) / 2);

    const nodes: Node[] = [
      ...left.map((s, i) => ({
        id: s.id,
        position: { x: leftX, y: i * ROW },
        data: { label: s.label },
        style: nodeStyle(theme, kindColor(theme, s.kind)),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })),
      ...right.map((s, i) => ({
        id: s.id,
        position: { x: rightX, y: centerY + i * ROW },
        data: { label: s.label },
        style: nodeStyle(theme, theme.color.accent, true),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })),
    ];

    const edges: Edge[] = pairs.map(([from, to]) => ({
      id: `${from}->${to}`,
      source: from,
      target: to,
      animated: true,
      style: { stroke: theme.color.border },
    }));

    return { nodes, edges };
  }, [specs, pairs, theme, isMobile]);

  const byId = useMemo(() => new Map(specs.map((s) => [s.id, s])), [specs]);

  return (
    <MapBox>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.2}
        nodesConnectable={false}
        nodesDraggable
        proOptions={{ hideAttribution: false }}
        onNodeClick={(_, node) => {
          const spec = byId.get(node.id);
          if (!spec) return;
          if (spec.role === "module") navigate(`/module/${spec.id}`);
          else if (spec.role === "agent") navigate(`/agent/${spec.id.replace(/^agent:/, "")}`);
        }}
        colorMode="dark"
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
        {!isMobile ? <MiniMap pannable zoomable /> : null}
      </ReactFlow>
    </MapBox>
  );
}
