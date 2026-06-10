import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { TaskDetail } from "./DetailPanel.js";
import { useDashboardStore } from "./store.js";
import { Nav } from "./ui.js";

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
        {task ? <TaskDetail task={task} /> : <div className="empty">Loading {id}…</div>}
      </div>
    </>
  );
}
