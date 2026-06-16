import type { Task, Column } from "./lib.js";
import { COLUMNS, orphanStatuses, formatTime, hexToRgb, taskStatusColor } from "./lib.js";
import { Badge, Button, Card, CardId, CardMeta, CardTitle } from "./components/index.js";

export function Nav({ projectName }: { projectName: string }) {
  return (
    <nav className="top-nav">
      <span className="nav-project">{projectName || "insight-flow"}</span>
      <div className="nav-links">
        <a href="/" className="nav-link">
          Home
        </a>
        <a href="/project" className="nav-link">
          Project
        </a>
        <a href="/agent" className="nav-link">
          Agents
        </a>
        <a href="/module" className="nav-link">
          Modules
        </a>
        <a href="/overview" className="nav-link">
          Overview
        </a>
        <a href="/config" className="nav-link">
          Config
        </a>
      </div>
    </nav>
  );
}

export function Stats({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const merged = tasks.filter((t) => ["merged", "done"].includes(t.status)).length;
  const active = tasks.filter((t) =>
    ["in-progress", "implementing", "changes-implementing"].includes(t.status),
  ).length;
  const reviews = tasks.reduce((s, t) => s + (t.reviews || []).length, 0);
  const cells = [
    { value: total, label: "Total Tasks" },
    { value: merged, label: "Completed" },
    { value: active, label: "Active" },
    { value: reviews, label: "Reviews" },
  ];
  return (
    <div className="stats">
      {cells.map((s) => (
        <div className="stat" key={s.label}>
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  // N129 — show the flow on cards bound to a non-default flow; default-flow
  // cards stay byte-identical to today (no chip).
  const flow = task.flowId && task.flowId !== "default" ? task.flowId : null;
  return (
    <Card onClick={() => onOpen(task.id)}>
      <CardId>
        {task.id} <Badge status={task.status} />
      </CardId>
      <CardTitle>{task.title}</CardTitle>
      <CardMeta>
        <span>{task.type}</span>
        <span>{task.priority}</span>
        {flow ? <span title={`flow: ${flow}`}>⛓ {flow.replace(/^custom:/, "")}</span> : null}
        <span>{formatTime(task.createdAt)}</span>
      </CardMeta>
    </Card>
  );
}

export function Kanban({
  tasks,
  onOpen,
  columns = COLUMNS,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  // N129 — columns derived from the flows' status sets; defaults to the
  // canonical 6 (default-only board + fallback while flow statuses load).
  columns?: Column[];
}) {
  // Tasks whose status matches no column degrade into a trailing "Other"
  // column instead of vanishing (graceful for a renamed/removed flow status).
  const orphans = orphanStatuses(
    tasks.map((t) => t.status),
    columns,
  );
  const rendered: Column[] = orphans.length
    ? [...columns, { key: "__other__", label: "Other", matches: orphans }]
    : columns;
  return (
    <div className="kanban">
      {rendered.map((col) => {
        const colTasks = tasks.filter((t) => col.matches.includes(t.status));
        return (
          <div className="column" key={col.key}>
            <div className="column-header">
              <span>{col.label}</span>
              <span className="column-count">{colTasks.length}</span>
            </div>
            {colTasks.length === 0 ? (
              <div className="empty">No tasks</div>
            ) : (
              colTasks.map((t) => <TaskCard key={t.id} task={t} onOpen={onOpen} />)
            )}
          </div>
        );
      })}
    </div>
  );
}

interface TimelineEvent {
  taskId: string;
  status: string;
  at: string;
  by?: string;
}

export function Timeline({ tasks }: { tasks: Task[] }) {
  const events: TimelineEvent[] = [];
  for (const t of tasks) {
    for (const h of t.statusHistory || []) {
      events.push({ taskId: t.id, status: h.status, at: h.at, by: h.by });
    }
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (events.length === 0) {
    return (
      <div className="activity-empty-state" style={{ padding: "16px 0" }}>
        <strong>No activity yet</strong>
        Task status changes will appear here as tasks move through the workflow.
      </div>
    );
  }

  return (
    <div className="act-item-list">
      {events.slice(0, 30).map((e, i) => {
        const color = taskStatusColor(e.status);
        return (
          <div
            className="act-item"
            key={e.taskId + e.at + i}
            style={{ borderBottomColor: color, background: `rgba(${hexToRgb(color)},0.08)` }}
          >
            <span style={{ fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
              {e.taskId}
            </span>
            <span style={{ color: "var(--text-muted)", margin: "0 4px", flexShrink: 0 }}>→</span>
            <span
              style={{
                background: `rgba(${hexToRgb(color)},0.18)`,
                color,
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {e.status}
            </span>
            <span style={{ color: "var(--text)", fontSize: 11, flex: 1, minWidth: 0 }}>
              {" "}
              by {e.by || "?"}
            </span>
            <span
              style={{
                marginLeft: "auto",
                color: "var(--text)",
                fontSize: 11,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {formatTime(e.at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ShardNav({
  shards,
  current,
  onSelect,
}: {
  shards: string[];
  current: string | null;
  onSelect: (name: string) => void;
}) {
  const idx = current ? shards.indexOf(current) : -1;
  const label = (current || "...").replace("tasks-", "").replace(".json", "");
  return (
    <div className="shard-nav">
      <Button $variant="nav" disabled={idx <= 0} onClick={() => onSelect(shards[idx - 1])}>
        &laquo; Newer
      </Button>
      <span>
        {label} ({idx + 1}/{shards.length})
      </span>
      <Button
        $variant="nav"
        disabled={idx >= shards.length - 1}
        onClick={() => onSelect(shards[idx + 1])}
      >
        Older &raquo;
      </Button>
    </div>
  );
}
