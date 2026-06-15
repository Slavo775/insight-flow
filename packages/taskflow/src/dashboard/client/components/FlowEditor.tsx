// N109 — the editable flow canvas for custom flows: draggable nodes whose
// positions report up for persistence into the flow definition's `layout`.
// N110 — connectable ports: every node takes inputs on its LEFT handle and
// emits outputs on its RIGHT handle (body centered). Drawing a connection
// opens a trigger picker constrained to the canonical status enum (plus the
// legal trigger-less direct handoff); self-loops and duplicate (from,to,on)
// triples are blocked; edges are selectable and Backspace/Delete-removable.
// N114 — agent management: an "Add agent" palette adds nodes from the registry;
// clicking a node opens a popover to remove it (and its incident edges). The
// draft now carries the agent set (the node ids), persisted on Save.
import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import styled, { useTheme } from "styled-components";
import { TASK_STATUSES } from "../../../core/statuses.js";
import { validateEdgeAddition } from "../../../core/flow-edit.js";
import type { FlowEdge } from "../../../core/flow-status.js";
import type { ProjectDto } from "../api.js";
import { computePositions } from "./FlowMap.js";
import { Button } from "./Button.js";

const EditBox = styled.div`
  position: relative;
  height: 620px;
  background: ${(p) => p.theme.color.surface};
  border: 1px dashed ${(p) => p.theme.color.accent};
  border-radius: ${(p) => p.theme.radius.xl};
  overflow: hidden;

  @media (max-width: 768px) {
    height: 70vh;
  }
`;

const PickerOverlay = styled.div`
  position: absolute;
  top: ${(p) => p.theme.space.lg};
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.accent};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md} ${(p) => p.theme.space.lg};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.text};

  select {
    background: ${(p) => p.theme.color.surface};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.md};
    padding: 4px 8px;
    font-family: ${(p) => p.theme.font.family};
  }
`;

const EditorError = styled.div`
  position: absolute;
  bottom: ${(p) => p.theme.space.lg};
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.red};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md} ${(p) => p.theme.space.lg};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.red};
`;

export type FlowPositions = Record<string, { x: number; y: number }>;

export interface FlowDraft {
  /** N114 — the flow's agent set (the node ids), persisted on Save. */
  agents: string[];
  positions: FlowPositions;
  flow: FlowEdge[];
}

/** N114 — a composed agent that can be added to the flow. */
export interface AgentChoice {
  id: string;
  title: string;
  source?: "builtin" | "custom";
}

const DIRECT_HANDOFF = "__direct__";

const AddBar = styled.div`
  position: absolute;
  top: ${(p) => p.theme.space.lg};
  left: ${(p) => p.theme.space.lg};
  z-index: 10;
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.sm} ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.textMuted};

  select {
    background: ${(p) => p.theme.color.surface};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.md};
    padding: 4px 8px;
    font-family: ${(p) => p.theme.font.family};
  }
`;

const NodePopover = styled.div`
  position: fixed;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.sm};
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.accent};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.text};
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.4);
`;

function toReactFlowEdge(e: FlowEdge, theme: ReturnType<typeof useTheme>): Edge {
  return {
    id: `${e.from}->${e.to}:${e.on ?? "handoff"}`,
    source: e.from,
    target: e.to,
    label: e.on ?? "",
    data: { on: e.on },
    labelStyle: { fill: theme.color.textMuted, fontFamily: theme.font.family, fontSize: 10 },
    labelBgStyle: { fill: theme.color.surface },
    style: { stroke: theme.color.border },
  };
}

function toFlowEdge(e: Edge): FlowEdge {
  const on = (e.data as { on?: string } | undefined)?.on;
  return { from: e.source, to: e.target, ...(on ? { on } : {}) };
}

export function FlowEditor({
  project,
  states,
  allAgents = [],
  onDraftChange,
}: {
  project: ProjectDto;
  /** N112 — the draft's custom states, offered (badged) in the trigger picker. */
  states?: { id: string; title: string }[];
  /** N114 — every composed agent (built-in + custom) for the Add palette + node labels. */
  allAgents?: AgentChoice[];
  /** Fired after every agent, position, or edge change with the full draft. */
  onDraftChange: (draft: FlowDraft) => void;
}) {
  const theme = useTheme();
  const [pending, setPending] = useState<Connection | null>(null);
  const [pendingTrigger, setPendingTrigger] = useState<string>(DIRECT_HANDOFF);
  const [editorError, setEditorError] = useState<string | null>(null);
  // N114 — node-click popover (Remove from flow), positioned at the click.
  const [nodeMenu, setNodeMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const titleOf = useCallback(
    (id: string): string =>
      allAgents.find((a) => a.id === id)?.title ?? project.agentTitles[id] ?? id,
    [allAgents, project.agentTitles],
  );

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
      // N110 — the port convention: inputs enter LEFT, outputs leave RIGHT.
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
    // The editor seeds once per project identity — live edits own the state,
    // so theme/title changes intentionally don't re-seed dragged positions.
  }, [project.id]); // eslint-disable-line

  const initialEdges: Edge[] = useMemo(
    () => project.flow.map((e) => toReactFlowEdge(e, theme)),
    // Seeded once per project identity, like the nodes.
    // eslint-disable-next-line
    [project.id],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const report = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]): void => {
      const positions: FlowPositions = {};
      for (const node of currentNodes) {
        positions[node.id] = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
      }
      onDraftChange({
        agents: currentNodes.map((n) => n.id),
        positions,
        flow: currentEdges.map(toFlowEdge),
      });
    },
    [onDraftChange],
  );

  // N114 — add an agent node (default position offset by node count so adds
  // don't stack); reports the new agent set + node.
  const addAgent = (agentId: string): void => {
    if (!agentId || nodes.some((n) => n.id === agentId)) return;
    const offset = 60 + nodes.length * 26;
    const newNode: Node = {
      id: agentId,
      position: { x: offset, y: offset },
      data: { label: `⚙ ${titleOf(agentId)}` },
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
    };
    const next = [...nodes, newNode];
    setNodes(next);
    report(next, edges);
  };

  // N114 — remove an agent node AND every edge incident to it (a saved flow
  // can't reference a missing agent — ProjectSchema rejects such edges).
  const removeAgent = (agentId: string): void => {
    const nextNodes = nodes.filter((n) => n.id !== agentId);
    const nextEdges = edges.filter((e) => e.source !== agentId && e.target !== agentId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setNodeMenu(null);
    report(nextNodes, nextEdges);
  };

  const availableAgents = allAgents.filter((a) => !nodes.some((n) => n.id === a.id));

  const confirmPending = (): void => {
    if (!pending) return;
    const on = pendingTrigger === DIRECT_HANDOFF ? undefined : pendingTrigger;
    const candidate: FlowEdge = {
      from: pending.source,
      to: pending.target,
      ...(on ? { on } : {}),
    };
    const rejection = validateEdgeAddition(edges.map(toFlowEdge), candidate);
    if (rejection) {
      setEditorError(rejection);
      setPending(null);
      return;
    }
    const next = [...edges, toReactFlowEdge(candidate, theme)];
    setEdges(next);
    setPending(null);
    setEditorError(null);
    report(nodes, next);
  };

  const handleEdgesChange = (changes: EdgeChange[]): void => {
    onEdgesChange(changes);
    if (changes.some((c) => c.type === "remove")) {
      const removed = new Set(
        changes.filter((c) => c.type === "remove").map((c) => (c as { id: string }).id),
      );
      report(
        nodes,
        edges.filter((e) => !removed.has(e.id)),
      );
    }
  };

  return (
    <EditBox>
      {!pending ? (
        <AddBar>
          Add agent
          <select
            value=""
            onChange={(e) => {
              addAgent(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              {availableAgents.length ? "Pick an agent…" : "All agents added"}
            </option>
            {availableAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
                {a.source === "custom" ? " (custom)" : ""}
              </option>
            ))}
          </select>
        </AddBar>
      ) : null}
      {nodeMenu ? (
        <NodePopover style={{ left: nodeMenu.x, top: nodeMenu.y }}>
          <strong>{titleOf(nodeMenu.id)}</strong>
          <Button type="button" $variant="danger" onClick={() => removeAgent(nodeMenu.id)}>
            Remove from flow
          </Button>
          <Button type="button" $variant="nav" onClick={() => setNodeMenu(null)}>
            Cancel
          </Button>
        </NodePopover>
      ) : null}
      {pending ? (
        <PickerOverlay>
          {pending.source} → {pending.target} on
          <select value={pendingTrigger} onChange={(e) => setPendingTrigger(e.target.value)}>
            <option value={DIRECT_HANDOFF}>(direct handoff)</option>
            {states?.length ? (
              <optgroup label="Custom states">
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} (custom)
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Canonical statuses">
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
          </select>
          <Button type="button" $variant="primary" onClick={confirmPending}>
            Add edge
          </Button>
          <Button type="button" $variant="nav" onClick={() => setPending(null)}>
            Cancel
          </Button>
        </PickerOverlay>
      ) : null}
      {editorError ? <EditorError role="alert">{editorError}</EditorError> : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={() => report(nodes, edges)}
        onNodeClick={(e, node) => setNodeMenu({ id: node.id, x: e.clientX, y: e.clientY })}
        onPaneClick={() => setNodeMenu(null)}
        onConnect={(connection) => {
          setEditorError(null);
          if (connection.source === connection.target) {
            setEditorError("self-loops are not allowed");
            return;
          }
          setPendingTrigger(DIRECT_HANDOFF);
          setPending(connection);
        }}
        isValidConnection={(c) => c.source !== c.target}
        fitView
        minZoom={0.2}
        nodesConnectable
        nodesDraggable
        edgesFocusable
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode="dark"
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </EditBox>
  );
}
