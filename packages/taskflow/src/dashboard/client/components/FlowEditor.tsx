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
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { FlowStatus } from "../lib.js";
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

// N150 — relation legend (status-change vs handover auto/gated).
const Legend = styled.div`
  position: absolute;
  bottom: ${(p) => p.theme.space.lg};
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

export type FlowPositions = Record<string, { x: number; y: number }>;

export interface FlowDraft {
  /** N114 — the flow's agent set (the node ids), persisted on Save. */
  agents: string[];
  positions: FlowPositions;
  flow: FlowEdge[];
  /** N134 — the flow's start-point agent ids (persisted as `entryAgents`). */
  entryAgents: string[];
  /** N169 — the flow's terminal "done" outcomes (statuses flagged `terminal`). */
  terminals: FlowStatus[];
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

// N115 — the edge editor modal (change trigger / delete relationship).
const ModalBackdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 0.45);
`;

const EdgeModal = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.md};
  min-width: 300px;
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.accent};
  border-radius: ${(p) => p.theme.radius.xl};
  padding: ${(p) => p.theme.space["2xl"]};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.text};

  select {
    background: ${(p) => p.theme.color.surface};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.md};
    padding: 6px 8px;
    font-family: ${(p) => p.theme.font.family};
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${(p) => p.theme.space.md};
  align-items: center;
`;

const ModalError = styled.span`
  color: ${(p) => p.theme.color.red};
  font-size: ${(p) => p.theme.font.size.xs};
`;

/**
 * Shared trigger `<option>` list: direct handoff, this flow's custom states, and
 * the flow's status universe. N155 — when the flow declares its own statuses
 * (N128 `Project.statuses`), offer those (that IS the flow's universe); otherwise
 * fall back to the canonical enum.
 */
function TriggerOptions({
  states,
  statuses,
}: {
  states?: { id: string; title: string }[];
  statuses?: { id: string; title: string }[];
}) {
  const flowScoped = statuses && statuses.length > 0;
  return (
    <>
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
      <optgroup label={flowScoped ? "Flow statuses" : "Canonical statuses"}>
        {flowScoped
          ? statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))
          : TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
      </optgroup>
    </>
  );
}

function toReactFlowEdge(e: FlowEdge, theme: ReturnType<typeof useTheme>): Edge {
  // N150 — the edge self-defines: a handover edge (carries `handover`) shows its
  // auto/gated badge; a plain status-change edge shows just its trigger. No
  // cross-check against agent modules, so no "orphan" concept here.
  const base = e.on ?? "";
  const ho = e.handover;
  const tag = ho ? `· ${ho.mode}` : "";
  const stroke = ho
    ? ho.mode === "auto"
      ? theme.color.green
      : theme.color.accent
    : theme.color.border;
  const label = base && tag ? `${base}  ${tag}` : base || tag;
  return {
    id: `${e.from}->${e.to}:${e.on ?? "handoff"}`,
    source: e.from,
    target: e.to,
    label,
    // N148 — carry the edge's own handover so it round-trips through the draft.
    data: { on: e.on, handover: ho },
    labelStyle: { fill: theme.color.textMuted, fontFamily: theme.font.family, fontSize: 10 },
    labelBgStyle: { fill: theme.color.surface },
    style: { stroke },
  };
}

function toFlowEdge(e: Edge): FlowEdge {
  const data = e.data as { on?: string; handover?: { mode: "auto" | "gated" } } | undefined;
  return {
    from: e.source,
    to: e.target,
    ...(data?.on ? { on: data.on } : {}),
    ...(data?.handover ? { handover: data.handover } : {}),
  };
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
  // N148 — the draft handover for the relation being created (null = status-change only).
  const [pendingHandover, setPendingHandover] = useState<{ mode: "auto" | "gated" } | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  // N114 — node-click popover (Remove from flow), positioned at the click.
  const [nodeMenu, setNodeMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  // N115/N148 — edge-click modal: trigger, handover (auto/gated or null), inline error.
  const [edgeMenu, setEdgeMenu] = useState<{
    id: string;
    trigger: string;
    handover: { mode: "auto" | "gated" } | null;
    error?: string;
  } | null>(null);
  // N134 — the draft's start-point agents (the flow's entryAgents). Seeded from
  // the project; toggled from the node popover, persisted by ProjectPage on Save.
  const [entryAgents, setEntryAgents] = useState<string[]>(project.entryAgents ?? []);
  // N169 — the flow's terminal outcomes (statuses flagged `terminal`). Seeded
  // from the saved flow; authored via "Add terminal"; persisted by ProjectPage.
  const [terminals, setTerminals] = useState<FlowStatus[]>(
    () => (project.statuses ?? []).filter((s) => s.terminal),
  );

  const titleOf = useCallback(
    (id: string): string =>
      terminals.find((t) => t.id === id)?.title ??
      allAgents.find((a) => a.id === id)?.title ??
      project.agentTitles[id] ??
      id,
    [allAgents, project.agentTitles, terminals],
  );

  // N169 — a terminal node renders as a circle; it only takes inputs (LEFT).
  const terminalNode = useCallback(
    (t: FlowStatus, pos: { x: number; y: number }): Node => ({
      id: t.id,
      position: pos,
      data: { label: `◉ ${t.title}`, kind: "terminal" },
      style: {
        background: theme.color.bg,
        color: t.color ?? theme.color.green,
        border: `2px solid ${t.color ?? theme.color.green}`,
        borderRadius: theme.radius.pill,
        fontFamily: theme.font.family,
        fontSize: theme.font.size.sm,
        padding: "12px 18px",
        width: 150,
        textAlign: "center" as const,
      },
      targetPosition: Position.Left,
    }),
    [theme],
  );

  const initialNodes: Node[] = useMemo(() => {
    const positions = computePositions(project);
    const agentNodes: Node[] = project.agents.map((a) => ({
      id: a,
      position: positions[a],
      data: { label: `⚙ ${project.agentTitles[a] ?? a}`, kind: "agent" },
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
    // N169 — seed terminal nodes from the saved flow's terminal statuses.
    const maxX = Math.max(0, ...project.agents.map((a) => positions[a]?.x ?? 0));
    const seededTerminals = (project.statuses ?? []).filter((s) => s.terminal);
    const terminalNodes = seededTerminals.map((t, i) =>
      terminalNode(t, project.layout?.[t.id] ?? { x: maxX + 280, y: i * 110 }),
    );
    return [...agentNodes, ...terminalNodes];
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
    (
      currentNodes: Node[],
      currentEdges: Edge[],
      currentEntry: string[] = entryAgents,
      currentTerminals: FlowStatus[] = terminals,
    ): void => {
      const positions: FlowPositions = {};
      for (const node of currentNodes) {
        positions[node.id] = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
      }
      // N169 — terminal nodes are not agents; keep them out of the agent set.
      const agentIds = currentNodes
        .filter((n) => (n.data as { kind?: string })?.kind !== "terminal")
        .map((n) => n.id);
      onDraftChange({
        agents: agentIds,
        positions,
        flow: currentEdges.map(toFlowEdge),
        // N134 — never report a start point that isn't (still) in the agent set.
        entryAgents: currentEntry.filter((id) => agentIds.includes(id)),
        terminals: currentTerminals,
      });
    },
    [onDraftChange, entryAgents, terminals],
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
  // N134 — a removed agent also drops from the start-point set.
  const removeAgent = (agentId: string): void => {
    const nextNodes = nodes.filter((n) => n.id !== agentId);
    const nextEdges = edges.filter((e) => e.source !== agentId && e.target !== agentId);
    const nextEntry = entryAgents.filter((id) => id !== agentId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setEntryAgents(nextEntry);
    setNodeMenu(null);
    report(nextNodes, nextEdges, nextEntry);
  };

  // N134 — toggle an agent as a flow start point (entryAgents); multiple
  // allowed. Reports the new entry set so ProjectPage persists it on Save.
  const toggleEntry = (agentId: string): void => {
    const nextEntry = entryAgents.includes(agentId)
      ? entryAgents.filter((id) => id !== agentId)
      : [...entryAgents, agentId];
    setEntryAgents(nextEntry);
    setNodeMenu(null);
    report(nodes, edges, nextEntry);
  };

  // N169 — add a terminal "done" node: name it, create a `terminal` status, drop
  // a circle node. The status + position are persisted by ProjectPage on Save.
  const addTerminal = (): void => {
    const title = window.prompt("Name this terminal outcome (e.g. Done, Rejected):")?.trim();
    if (!title) return;
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "done";
    const taken = new Set([...terminals.map((t) => t.id), ...nodes.map((nd) => nd.id)]);
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    const status: FlowStatus = { id, title, terminal: true };
    const offset = 80 + nodes.length * 26;
    const nextTerminals = [...terminals, status];
    const nextNodes = [...nodes, terminalNode(status, { x: offset + 360, y: offset })];
    setTerminals(nextTerminals);
    setNodes(nextNodes);
    report(nextNodes, edges, entryAgents, nextTerminals);
  };

  // N169 — remove a terminal node, its status, and every edge into it.
  const removeTerminal = (id: string): void => {
    const nextTerminals = terminals.filter((t) => t.id !== id);
    const nextNodes = nodes.filter((n) => n.id !== id);
    const nextEdges = edges.filter((e) => e.source !== id && e.target !== id);
    setTerminals(nextTerminals);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setNodeMenu(null);
    report(nextNodes, nextEdges, entryAgents, nextTerminals);
  };

  const isTerminal = (id: string): boolean => terminals.some((t) => t.id === id);

  // N134 — reflect start-point toggles on the canvas: ★-prefix the label and
  // thicken the border for entry agents (node identity/positions untouched).
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        // N169 — terminal nodes keep their own ◉ label/style; only agents get
        // the ★ start-point treatment.
        if ((n.data as { kind?: string })?.kind === "terminal") return n;
        const isEntry = entryAgents.includes(n.id);
        return {
          ...n,
          data: { ...n.data, label: `${isEntry ? "★ " : ""}⚙ ${titleOf(n.id)}` },
          style: { ...n.style, border: `${isEntry ? 2 : 1}px solid ${theme.color.accent}` },
        };
      }),
    );
  }, [entryAgents, setNodes, titleOf, theme.color.accent]);

  const availableAgents = allAgents.filter((a) => !nodes.some((n) => n.id === a.id));

  // N115 — edge editor modal: change an existing edge's trigger, or delete it.
  const editEdge = edgeMenu ? edges.find((e) => e.id === edgeMenu.id) : undefined;

  const saveEdgeTrigger = (): void => {
    if (!edgeMenu || !editEdge) return;
    const on = edgeMenu.trigger === DIRECT_HANDOFF ? undefined : edgeMenu.trigger;
    const candidate: FlowEdge = {
      from: editEdge.source,
      to: editEdge.target,
      ...(on ? { on } : {}),
      ...(edgeMenu.handover ? { handover: edgeMenu.handover } : {}),
    };
    // A trigger change is remove-old + add-new: validate against the OTHER
    // edges so the same duplicate-(from,to,on) rule applies.
    const others = edges.filter((e) => e.id !== edgeMenu.id).map(toFlowEdge);
    const rejection = validateEdgeAddition(others, candidate);
    if (rejection) {
      setEdgeMenu({ ...edgeMenu, error: rejection });
      return;
    }
    const replaced = toReactFlowEdge(candidate, theme);
    const next = edges.map((e) => (e.id === edgeMenu.id ? replaced : e));
    setEdges(next);
    setEdgeMenu(null);
    report(nodes, next);
  };

  const deleteEdge = (): void => {
    if (!edgeMenu) return;
    const next = edges.filter((e) => e.id !== edgeMenu.id);
    setEdges(next);
    setEdgeMenu(null);
    report(nodes, next);
  };

  const confirmPending = (): void => {
    if (!pending) return;
    const on = pendingTrigger === DIRECT_HANDOFF ? undefined : pendingTrigger;
    const candidate: FlowEdge = {
      from: pending.source,
      to: pending.target,
      ...(on ? { on } : {}),
      ...(pendingHandover ? { handover: pendingHandover } : {}),
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
    setPendingHandover(null);
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
          {/* N169 — author a terminal "done" outcome. */}
          <Button type="button" $variant="secondary" onClick={addTerminal}>
            ◉ Add terminal
          </Button>
        </AddBar>
      ) : null}
      {nodeMenu ? (
        <NodePopover style={{ left: nodeMenu.x, top: nodeMenu.y }}>
          <strong>{titleOf(nodeMenu.id)}</strong>
          {isTerminal(nodeMenu.id) ? (
            // N169 — terminal node menu: remove only (no start-point toggle).
            <Button type="button" $variant="danger" onClick={() => removeTerminal(nodeMenu.id)}>
              Remove terminal
            </Button>
          ) : (
            <>
              <Button type="button" $variant="primary" onClick={() => toggleEntry(nodeMenu.id)}>
                {entryAgents.includes(nodeMenu.id) ? "Unset start point" : "Set as start point"}
              </Button>
              <Button type="button" $variant="danger" onClick={() => removeAgent(nodeMenu.id)}>
                Remove from flow
              </Button>
            </>
          )}
          <Button type="button" $variant="nav" onClick={() => setNodeMenu(null)}>
            Cancel
          </Button>
        </NodePopover>
      ) : null}
      {pending ? (
        <PickerOverlay>
          {pending.source} → {pending.target} on
          <select value={pendingTrigger} onChange={(e) => setPendingTrigger(e.target.value)}>
            <TriggerOptions states={states} statuses={project.statuses} />
          </select>
          <label>
            <input
              type="checkbox"
              checked={pendingHandover !== null}
              onChange={(e) => setPendingHandover(e.target.checked ? { mode: "gated" } : null)}
            />{" "}
            Handover to this agent
          </label>
          {pendingHandover ? (
            <select
              value={pendingHandover.mode}
              onChange={(e) => setPendingHandover({ mode: e.target.value as "auto" | "gated" })}
            >
              <option value="gated">gated (ask first)</option>
              <option value="auto">auto (chain)</option>
            </select>
          ) : null}
          <Button type="button" $variant="primary" onClick={confirmPending}>
            Add edge
          </Button>
          <Button type="button" $variant="nav" onClick={() => setPending(null)}>
            Cancel
          </Button>
        </PickerOverlay>
      ) : null}
      {edgeMenu && editEdge ? (
        <ModalBackdrop onClick={() => setEdgeMenu(null)}>
          <EdgeModal onClick={(e) => e.stopPropagation()}>
            <strong>
              {titleOf(editEdge.source)} → {titleOf(editEdge.target)}
            </strong>
            <label>
              Trigger
              <select
                value={edgeMenu.trigger}
                onChange={(e) =>
                  setEdgeMenu({ ...edgeMenu, trigger: e.target.value, error: undefined })
                }
              >
                <TriggerOptions states={states} statuses={project.statuses} />
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={edgeMenu.handover !== null}
                onChange={(e) =>
                  setEdgeMenu({
                    ...edgeMenu,
                    handover: e.target.checked ? { mode: "gated" } : null,
                    error: undefined,
                  })
                }
              />{" "}
              Handover to this agent
            </label>
            {edgeMenu.handover ? (
              <label>
                Mode
                <select
                  value={edgeMenu.handover.mode}
                  onChange={(e) =>
                    setEdgeMenu({
                      ...edgeMenu,
                      handover: { mode: e.target.value as "auto" | "gated" },
                    })
                  }
                >
                  <option value="gated">gated (ask first)</option>
                  <option value="auto">auto (chain)</option>
                </select>
              </label>
            ) : null}
            {edgeMenu.error ? <ModalError>{edgeMenu.error}</ModalError> : null}
            <ModalActions>
              <Button type="button" $variant="primary" onClick={saveEdgeTrigger}>
                Save
              </Button>
              <Button type="button" $variant="danger" onClick={deleteEdge}>
                Delete edge
              </Button>
              <Button type="button" $variant="nav" onClick={() => setEdgeMenu(null)}>
                Cancel
              </Button>
            </ModalActions>
          </EdgeModal>
        </ModalBackdrop>
      ) : null}
      {editorError ? <EditorError role="alert">{editorError}</EditorError> : null}
      <Legend>
        <span style={{ color: theme.color.textMuted }}>— status change</span>
        <span style={{ color: theme.color.green }}>● handover (auto)</span>
        <span style={{ color: theme.color.accent }}>● handover (gated)</span>
      </Legend>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={() => report(nodes, edges)}
        onNodeClick={(e, node) => setNodeMenu({ id: node.id, x: e.clientX, y: e.clientY })}
        onEdgeClick={(_, edge) => {
          const data = edge.data as
            | { on?: string; handover?: { mode: "auto" | "gated" } }
            | undefined;
          setEdgeMenu({
            id: edge.id,
            trigger: data?.on ?? DIRECT_HANDOFF,
            handover: data?.handover ?? null,
          });
        }}
        onPaneClick={() => {
          setNodeMenu(null);
          setEdgeMenu(null);
        }}
        onConnect={(connection) => {
          setEditorError(null);
          if (connection.source === connection.target) {
            setEditorError("self-loops are not allowed");
            return;
          }
          // N169 — a terminal is an end state: it can be a target, never a source.
          if (connection.source && isTerminal(connection.source)) {
            setEditorError("a terminal node has no outgoing edges");
            return;
          }
          setPendingTrigger(DIRECT_HANDOFF);
          setPendingHandover(null);
          setPending(connection);
        }}
        isValidConnection={(c) => c.source !== c.target && !(c.source != null && isTerminal(c.source))}
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
