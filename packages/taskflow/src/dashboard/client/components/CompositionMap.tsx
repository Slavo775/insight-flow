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
  MarkerType,
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
    case "bundle":
      return theme.color.amber;
    case "status-transition":
      return theme.color.red;
    case "handover":
      return theme.color.accent;
    case "subagent":
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
  /**
   * Module-node click handler. Defaults to navigating to /module/<id>;
   * the agent page passes a modal opener instead (change request R1 —
   * "click to module its so annoying").
   */
  onModuleClick,
  readOnly = false,
}: {
  nodes: MapNodeSpec[];
  edges: [string, string][];
  onModuleClick?: (moduleId: string) => void;
  /**
   * N135 — when true, node clicks never navigate to a detail page (used by
   * edit/create surfaces that embed the map as a live preview, where a
   * navigation would discard unsaved input). An `onModuleClick` handler still
   * fires, so an in-place modal preview keeps working.
   */
  readOnly?: boolean;
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { nodes, edges } = useMemo(() => {
    // N163 — directional columns derived from edge direction relative to the
    // emphasized subject: inputs (→ subject) on the LEFT, the subject in the
    // MIDDLE, outputs (subject →) and any unconnected nodes on the RIGHT. So the
    // module page shows the subject module left of its consuming agents, with
    // inputs on the left and outputs on the right.
    const subjectIds = new Set(specs.filter((s) => s.emphasis).map((s) => s.id));
    const feedsSubject = (id: string): boolean =>
      pairs.some(([from, to]) => from === id && subjectIds.has(to));
    const inputs = specs.filter((s) => !s.emphasis && feedsSubject(s.id));
    const subjects = specs.filter((s) => s.emphasis);
    const outputs = specs.filter((s) => !s.emphasis && !feedsSubject(s.id));

    const ROW = 78;
    const COL = isMobile ? 240 : 360;
    // With no inputs, keep the subject in the left column (agent map: modules →
    // agent → nothing on the right would otherwise float the agent mid-canvas).
    const midX = inputs.length ? COL : 0;
    const tallest = Math.max(inputs.length, subjects.length, outputs.length, 1);
    const place = (arr: MapNodeSpec[], x: number): Node[] => {
      const offset = Math.max(0, ((tallest - arr.length) * ROW) / 2);
      return arr.map((s, i) => ({
        id: s.id,
        position: { x, y: offset + i * ROW },
        data: { label: s.label },
        style: nodeStyle(
          theme,
          s.emphasis ? theme.color.accent : kindColor(theme, s.kind),
          s.emphasis,
        ),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }));
    };

    const nodes: Node[] = [
      ...place(inputs, 0),
      ...place(subjects, midX),
      ...place(outputs, midX + COL),
    ];

    const edges: Edge[] = pairs.map(([from, to]) => ({
      id: `${from}->${to}`,
      source: from,
      target: to,
      animated: true,
      // N163 — visible relationships: a left-to-right arrowhead + a stronger
      // stroke than the near-invisible border colour used before.
      markerEnd: { type: MarkerType.ArrowClosed, color: theme.color.accent, width: 18, height: 18 },
      style: { stroke: theme.color.accent, strokeWidth: 1.5 },
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
          if (spec.role === "module") {
            if (onModuleClick) onModuleClick(spec.id);
            else if (!readOnly) navigate(`/module/${spec.id}`);
          } else if (spec.role === "agent") {
            if (!readOnly) navigate(`/agent/${spec.id.replace(/^agent:/, "")}`);
          } else if (spec.role === "facet" && onModuleClick) {
            // Facet nodes (e.g. the “@AGENT_ENFORCEMENT.md” node on the module
            // map) open the module modal too (human review R2).
            onModuleClick(spec.id.replace(/^facet:/, ""));
          }
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
