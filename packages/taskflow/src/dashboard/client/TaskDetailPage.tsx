import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { currentFlowNodes } from "../../core/flow-status.js";
import { fetchProject, type ProjectDto } from "./api.js";
import { FlowMap } from "./components/FlowMap.js";
import { TaskDetail } from "./DetailPanel.js";
import { useDashboardStore } from "./store.js";
import { Nav } from "./ui.js";

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
  const current = currentFlowNodes(project.flow, status);

  return (
    <FlowSection open={typeof window === "undefined" || window.innerWidth > 768}>
      <summary>Lifecycle position</summary>
      {current.length === 0 ? (
        <FlowNote>
          Status “{status}” has no handoff edge in the project flow (an agent is mid-work or the
          task is terminal) — showing the full lifecycle map.
        </FlowNote>
      ) : null}
      <FlowMap project={project} highlightNodes={current} />
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
            <TaskFlowPosition status={task.status} />
          </>
        ) : (
          <div className="empty">Loading {id}…</div>
        )}
      </div>
    </>
  );
}
