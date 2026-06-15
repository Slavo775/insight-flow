import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { currentFlowNodes, suggestNextSteps } from "../../core/flow-status.js";
import {
  fetchProject,
  fetchProjects,
  setTaskFlow,
  type ProjectDto,
  type ProjectSummaryDto,
} from "./api.js";
import { FlowMap } from "./components/FlowMap.js";
import { TaskDetail } from "./DetailPanel.js";
import { useDashboardStore } from "./store.js";
import { Nav } from "./ui.js";

// N117 — flow reassignment control (enabled only while the task is `ready`).
const FlowBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  margin-top: ${(p) => p.theme.space.xl};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.textMuted};

  select {
    background: ${(p) => p.theme.color.bg};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.md};
    padding: 4px 8px;
    font-family: ${(p) => p.theme.font.family};
  }
  select:disabled {
    opacity: 0.5;
  }
`;

const FlowBarError = styled.span`
  color: ${(p) => p.theme.color.red};
  font-size: ${(p) => p.theme.font.size.xs};
`;

function TaskFlowSelector({
  taskId,
  flowId,
  status,
}: {
  taskId: string;
  flowId: string;
  status: string;
}) {
  const [flows, setFlows] = useState<ProjectSummaryDto[]>([]);
  const [value, setValue] = useState(flowId);
  const [error, setError] = useState<string | null>(null);
  const locked = status !== "ready";

  useEffect(() => {
    fetchProjects().then(
      (list) => setFlows(list),
      () => setFlows([]),
    );
  }, []);
  useEffect(() => setValue(flowId), [flowId]);

  const change = async (next: string): Promise<void> => {
    setError(null);
    const prev = value;
    setValue(next);
    try {
      await setTaskFlow(taskId, next);
    } catch (err) {
      setValue(prev);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <FlowBar>
      Flow
      <select
        value={value}
        disabled={locked}
        title={locked ? "the flow locks once work starts" : "reassign this task's flow"}
        onChange={(e) => void change(e.target.value)}
      >
        {/* Ensure the current value is selectable even if the list hasn't loaded. */}
        {!flows.some((f) => f.id === value) ? <option value={value}>{value}</option> : null}
        {flows.map((f) => (
          <option key={f.id} value={f.id}>
            {f.title}
            {f.source === "builtin" ? " (shipped)" : ""}
          </option>
        ))}
      </select>
      {locked ? <span>· locks once work starts</span> : null}
      {error ? <FlowBarError>{error}</FlowBarError> : null}
    </FlowBar>
  );
}

const FlowSection = styled.details`
  margin-top: ${(p) => p.theme.space["2xl"]};

  & > summary {
    cursor: pointer;
    font-size: ${(p) => p.theme.font.size.sm};
    color: ${(p) => p.theme.color.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: ${(p) => p.theme.space.lg};
  }
`;

const FlowNote = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.sm};
  margin: ${(p) => p.theme.space.md} 0;
`;

const SuggestionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  margin: ${(p) => p.theme.space.md} 0 ${(p) => p.theme.space.lg};
`;

const SuggestionChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${(p) => p.theme.space.sm};
  padding: 4px 12px;
  border: 1px dashed ${(p) => p.theme.color.accent};
  border-radius: ${(p) => p.theme.radius["2xl"]};
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.sm};
  text-decoration: none;

  &:hover {
    background: ${(p) => p.theme.color.surface};
  }
`;

const SlashCommand = styled.code`
  color: ${(p) => p.theme.color.accent};
  cursor: copy;
  font-size: ${(p) => p.theme.font.size.xs};
`;

// N105: suggested next agents from the flow's outgoing edges — display only;
// the next/next-review pickers stay canonical. The slash command copies on click.
function NextStepChips({
  steps,
  agentTitles,
}: {
  steps: { agentId: string; on: string; label: string }[];
  agentTitles: Record<string, string>;
}) {
  if (!steps.length) return null;
  return (
    <SuggestionRow>
      <FlowNote as="span">Suggested next:</FlowNote>
      {steps.map((s) => (
        <SuggestionChip key={s.agentId} to={`/agent/${s.agentId}`} title={`on ${s.label}`}>
          ▶ {agentTitles[s.agentId] ?? s.agentId}
          <SlashCommand
            title="Copy slash command"
            onClick={(e) => {
              e.preventDefault();
              void navigator.clipboard?.writeText(`/${s.agentId}`);
            }}
          >
            /{s.agentId}
          </SlashCommand>
        </SuggestionChip>
      ))}
    </SuggestionRow>
  );
}

// N104: the task's position in the project lifecycle flow. Producers of the
// current status light up (📍); statuses without flow edges (working states
// like in-progress) render the map with an explanatory note instead.
function TaskFlowPosition({ status }: { status: string }) {
  const [project, setProject] = useState<ProjectDto | null>(null);
  useEffect(() => {
    fetchProject()
      .then(setProject)
      .catch(() => setProject(null));
  }, []);

  if (!project) return null;
  // N112 — custom states alias onto canonical statuses; the task's status is
  // always canonical, the flow's triggers may not be.
  const current = currentFlowNodes(project.flow, status, project.states);
  const nextSteps = suggestNextSteps(project.flow, status, project.states);

  return (
    <FlowSection open={typeof window === "undefined" || window.innerWidth > 768}>
      <summary>Lifecycle position</summary>
      {current.length === 0 ? (
        <FlowNote>
          Status “{status}” has no handoff edge in the project flow (an agent is mid-work or the
          task is terminal) — no suggested next steps; showing the full lifecycle map.
        </FlowNote>
      ) : null}
      <NextStepChips steps={nextSteps} agentTitles={project.agentTitles} />
      <FlowMap
        project={project}
        highlightNodes={current}
        secondaryHighlightNodes={nextSteps.map((s) => s.agentId)}
      />
    </FlowSection>
  );
}

// N87: dedicated, URL-addressable full-page task detail (/task/:id). Reuses the
// reading-mode TaskDetail body; resolves the task from the store, loading its
// shard on demand when it isn't the currently-loaded one.
export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tasks = useDashboardStore((s) => s.tasks);
  const ensureTask = useDashboardStore((s) => s.ensureTask);
  const projectName = useDashboardStore((s) => s.snapshot?.projectName ?? "");

  useEffect(() => {
    if (id) void ensureTask(id);
  }, [id, ensureTask]);

  const task = id ? (tasks.find((t) => t.id === id) ?? null) : null;

  return (
    <>
      <Nav projectName={projectName} />
      <div className="task-page">
        <Link to="/" className="back-link">
          ← Back to board
        </Link>
        {task ? (
          <>
            <TaskDetail task={task} />
            <TaskFlowSelector
              taskId={task.id}
              flowId={task.flowId ?? "default"}
              status={task.status}
            />
            <TaskFlowPosition status={task.status} />
          </>
        ) : (
          <div className="empty">Loading {id}…</div>
        )}
      </div>
    </>
  );
}
