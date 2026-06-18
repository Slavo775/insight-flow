// N96 — the project flow map: agents as nodes, lifecycle edges labeled with
// their status/verdict triggers. Layout: BFS layering from the flow's roots
// (no incoming edges); agents outside the flow sit in a trailing column.
// Clicking an agent navigates to /agent/:id. Read-only this iteration.
import { useMemo } from "react";
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
import type { ProjectDto } from "../api.js";
import { classifyEdge, type AgentHandover } from "../../../core/flow-status.js";

const MapBox = styled.div`
  position: relative;
  height: 620px;
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  overflow: hidden;

  @media (max-width: 768px) {
    height: 70vh;
  }
`;

// N144 — auto/gated/orphan legend for the edge badges (parity with FlowEditor).
const Legend = styled.div`
  position: absolute;
  top: ${(p) => p.theme.space.lg};
  right: ${(p) => p.theme.space.lg};
  z-index: 10;
  display: flex;
  gap: ${(p) => p.theme.space.md};
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.sm} ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.xs};
  color: ${(p) => p.theme.color.textMuted};
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

const COL_W = 280;
const ROW_H = 110;

/**
 * N109 — resolved node positions: the stored hand-arranged layout wins,
 * missing entries fall back to the BFS auto-layout. Shared by the read-only
 * map and the edit canvas so both render identically.
 */
export function computePositions(project: ProjectDto): Record<string, { x: number; y: number }> {
  const depth = layerAgents(project);
  const byColumn = new Map<number, string[]>();
  for (const a of project.agents) {
    const col = depth.get(a) ?? 0;
    (byColumn.get(col) ?? byColumn.set(col, []).get(col)!).push(a);
  }
  const out: Record<string, { x: number; y: number }> = {};
  for (const a of project.agents) {
    const col = depth.get(a) ?? 0;
    const row = (byColumn.get(col) ?? [a]).indexOf(a);
    out[a] = project.layout?.[a] ?? { x: col * COL_W, y: row * ROW_H };
  }
  return out;
}

export function FlowMap({
  project,
  highlightNodes,
  secondaryHighlightNodes,
  handoversByAgent = {},
  builtinAgents,
  readOnly = false,
}: {
  project: ProjectDto;
  /** N104: node ids rendered with the "task is here" accent (📍 badge). */
  highlightNodes?: string[];
  /** N105: suggested next agents — dashed accent (▶ badge). */
  secondaryHighlightNodes?: string[];
  /** N144 — declared handovers per agent; backs edges with an auto/gated badge. */
  handoversByAgent?: Record<string, AgentHandover[]>;
  /** N146 — built-in/locked agent ids; unbacked edges from these are neutral, not orphan. */
  builtinAgents?: ReadonlySet<string>;
  /** N135 — suppress node-click navigation when embedded in an edit/create surface. */
  readOnly?: boolean;
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const builtins = builtinAgents ?? new Set<string>();

  const { nodes, edges } = useMemo(() => {
    const positions = computePositions(project);

    const nodes: Node[] = project.agents.map((a) => {
      const isCurrent = highlightNodes?.includes(a) ?? false;
      const isSuggested = !isCurrent && (secondaryHighlightNodes?.includes(a) ?? false);
      // N134 — start-point agents (entryAgents) carry a leading ★.
      const isEntry = project.entryAgents?.includes(a) ?? false;
      const badge = `${isEntry ? "★ " : ""}${isCurrent ? "📍 " : isSuggested ? "▶ " : ""}`;
      return {
        id: a,
        position: positions[a],
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

    const edges: Edge[] = project.flow.map((e) => {
      // N112 — a custom-state trigger renders its title and color.
      const state = project.states?.find((s) => s.id === e.on);
      // N144/N146 — the diagram is non-binding. Three-way classification:
      // backed (mode badge) · built-in source (neutral "not backed") · orphan
      // (red ⚠, a custom source the user can add a handover to). Custom-state
      // triggers are resolved to canonical before matching (N146).
      const { backing, handover } = classifyEdge(e, handoversByAgent, builtins, project.states);
      const base = state?.title ?? e.on ?? "";
      let tag: string;
      let stroke: string;
      let labelFill: string;
      let dashed = false;
      if (backing === "backed" && handover) {
        tag = `· ${handover.mode}`;
        stroke = handover.mode === "auto" ? theme.color.green : theme.color.accent;
        labelFill = state?.color ?? theme.color.textMuted;
      } else if (backing === "builtin-source") {
        tag = "· not backed (built-in)";
        stroke = theme.color.textMuted;
        labelFill = theme.color.textMuted;
        dashed = true;
      } else {
        tag = "⚠ orphan";
        stroke = theme.color.red;
        labelFill = theme.color.red;
        dashed = true;
      }
      return {
        id: `${e.from}->${e.to}:${e.on ?? "handoff"}`,
        source: e.from,
        target: e.to,
        animated: true,
        label: base ? `${base}  ${tag}` : tag,
        labelStyle: { fill: labelFill, fontFamily: theme.font.family, fontSize: 10 },
        labelBgStyle: { fill: theme.color.surface },
        style: { stroke, ...(dashed ? { strokeDasharray: "5 4" } : {}) },
      };
    });

    return { nodes, edges };
  }, [project, theme, highlightNodes, secondaryHighlightNodes, handoversByAgent, builtins]);

  const hasEdges = project.flow.length > 0;

  return (
    <MapBox>
      {hasEdges ? (
        <Legend>
          <span style={{ color: theme.color.green }}>● auto</span>
          <span style={{ color: theme.color.accent }}>● gated</span>
          <span style={{ color: theme.color.textMuted }}>not backed (built-in)</span>
          <span style={{ color: theme.color.red }}>⚠ orphan</span>
        </Legend>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.2}
        nodesConnectable={false}
        nodesDraggable
        onNodeClick={readOnly ? undefined : (_, node) => navigate(`/agent/${node.id}`)}
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
