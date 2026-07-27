import { NavLink } from "react-router-dom";
import styled from "styled-components";
import { apiUrl } from "./base.js";
import type { Task, Column, FlowStatus } from "./lib.js";
import {
  COLUMNS,
  orphanStatuses,
  statusColor,
  statusHeaderColor,
  formatTime,
  hexToRgb,
  taskStatusColor,
} from "./lib.js";
import {
  Badge,
  Button,
  Card,
  CardId,
  CardMeta,
  CardTitle,
  Chip,
  Header,
  ScrollShadow,
  SearchInput,
  SquareIconButton,
  StatTile,
  type StatTone,
} from "./components/index.js";
import { ArrowLeftIcon, ArrowRightIcon, SettingsIcon } from "./components/icons.js";
import { useFlowStatusMap } from "./flow-columns.js";

// N258 — break the promoted (centered) Header out of the body's 24px padding and
// pull it up so the sticky bar meets the viewport top, matching the old .top-nav.
const ProjectHeader = styled(Header)`
  margin: -24px -24px 24px;
  top: -24px;
`;

// A pill link back to the master hub. Root-absolute (like the Overview link
// below) so it resolves to the hub overview under the proxy.
const HubLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  height: 48px;
  padding: 0 18px;
  border-radius: ${(p) => p.theme.radius.lg};
  border: 1px solid ${(p) => p.theme.color.border};
  background: ${(p) => p.theme.color.surface};
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.lg};
  font-weight: ${(p) => p.theme.font.weight.semibold};
  text-decoration: none;
  &:hover {
    border-color: ${(p) => p.theme.color.accent};
  }
`;

export function Nav({
  projectName,
  query = "",
  onQuery,
}: {
  projectName: string;
  // N258 — the header search filters the board; optional so Nav renders standalone.
  query?: string;
  onQuery?: (value: string) => void;
}) {
  return (
    <ProjectHeader
      maxWidth="100%"
      eyebrow="PROJECT"
      title={projectName || "insight-flow"}
      before={
        <HubLink href="/overview" aria-label="Back to hub">
          <ArrowLeftIcon size={18} />
          hub
        </HubLink>
      }
      center={
        <nav aria-label="Project sections">
          <ScrollShadow>
            <div className="nav-links">
              {/* N218/N220 — NavLink so nav respects the router basename under the hub
                  proxy (/project/<id>/…) AND marks the current section active; a raw
                  <a href="/agent"> would drop the prefix and 404 at the master root.
                  `end` on Home so it is active only on the exact "/" route. */}
              <NavLink to="/" end className="nav-link">
                Home
              </NavLink>
              <NavLink to="/project" className="nav-link">
                Project
              </NavLink>
              <NavLink to="/agent" className="nav-link">
                Agents
              </NavLink>
              <NavLink to="/module" className="nav-link">
                Modules
              </NavLink>
              {/* Overview + Config leave the SPA (server-rendered pages), so they are
                  full-document anchors, not SPA links, and never show an active state.
                  Overview targets the master root (root-absolute). Config must keep the
                  project prefix, so it uses apiUrl() (prepends BASE) — a react-router
                  <Link>/NavLink would pushState to a route that does not exist and blank
                  the page. */}
              <a href="/overview" className="nav-link">
                Overview
              </a>
              <a href={apiUrl("/config")} className="nav-link">
                Config
              </a>
            </div>
          </ScrollShadow>
        </nav>
      }
    >
      <div style={{ width: 220, maxWidth: "40vw" }}>
        <SearchInput
          value={query}
          onChange={(e) => onQuery?.(e.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
        />
      </div>
      {/* Settings gear → the server-rendered /config page. Full-document anchor via
          apiUrl() (keeps the /p/<id>/ proxy prefix); a react-router Link would
          pushState to a non-existent route and blank the page. */}
      <SquareIconButton as="a" href={apiUrl("/config")} aria-label="Project config">
        <SettingsIcon size={16} />
      </SquareIconButton>
    </ProjectHeader>
  );
}

// N259 — a 2-column grid that becomes 4 across on wider screens, so the four tiles
// wrap 2×2 (never 3+1). Matches the Lovable design's grid-cols-2 sm:grid-cols-4.
const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${(p) => p.theme.space["2xl"]};
  margin-top: ${(p) => p.theme.space["2xl"]};

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

// N259 — "waiting for a review verdict": work is done, a review is the next step.
// Tolerant named set — flows are custom and Task.status is a plain string, so match
// the known review-pending statuses rather than a strict enum.
const REVIEW_PENDING = ["implemented", "reviewing", "fixed"];

export function Stats({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => ["merged", "done"].includes(t.status)).length;
  const active = tasks.filter((t) =>
    ["in-progress", "implementing", "changes-implementing"].includes(t.status),
  ).length;
  // N259 — count TASKS awaiting review (was: sum of review-history entries).
  const reviews = tasks.filter((t) => REVIEW_PENDING.includes(t.status)).length;
  const cells: { value: number; label: string; tone: StatTone }[] = [
    { value: total, label: "Total Tasks", tone: "neutral" },
    { value: completed, label: "Completed", tone: "green" },
    { value: active, label: "Active", tone: "amber" },
    { value: reviews, label: "Reviews", tone: "violet" },
  ];
  return (
    <StatsRow>
      {cells.map((s) => (
        <StatTile key={s.label} value={s.value} label={s.label} tone={s.tone} />
      ))}
    </StatsRow>
  );
}

// N260 — ticket card = the shared Card with a status-colored left border (kept on
// hover, so it doesn't flip to the accent) and a 2-line-clamped title.
const AccentCard = styled(Card)<{ $color: string }>`
  border-left: 3px solid ${(p) => p.$color};
  &:hover {
    border-left-color: ${(p) => p.$color};
  }
  /* N260 — the card is a keyboard-operable control (role=button below). Inset ring
     so it isn't clipped by the board's ScrollShadow (overflow-y:hidden). */
  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.color.accent};
    outline-offset: -2px;
  }
`;

const TicketTitle = styled(CardTitle)`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

function TaskCard({
  task,
  statuses,
  onOpen,
}: {
  task: Task;
  // N130 — the task's flow status set, for per-flow badge styling.
  statuses?: FlowStatus[];
  onOpen: (id: string) => void;
}) {
  // N129 — show the flow on cards bound to a non-default flow; default-flow
  // cards stay byte-identical to today (no chip).
  const flow = task.flowId && task.flowId !== "default" ? task.flowId : null;
  const open = () => onOpen(task.id);
  return (
    // N260 — keyboard-operable ticket card (Card is a div): expose a button role,
    // make it tabbable, and open on Enter/Space. Focusing an off-screen card also
    // scrolls the board's ScrollShadow strip into view (keyboard-scrollable board).
    <AccentCard
      $color={taskStatusColor(task.status)}
      onClick={open}
      role="button"
      tabIndex={0}
      aria-label={`${task.id}: ${task.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <CardId>
        {task.id} <Badge status={task.status} statuses={statuses} />
      </CardId>
      <TicketTitle>{task.title}</TicketTitle>
      <CardMeta>
        <span>{task.type}</span>
        <span>{task.priority}</span>
        {flow ? <span title={`flow: ${flow}`}>⛓ {flow.replace(/^custom:/, "")}</span> : null}
        <span>{formatTime(task.createdAt)}</span>
      </CardMeta>
    </AccentCard>
  );
}

const BoardFrame = styled.section`
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  background: ${(p) => p.theme.color.surface};
  padding: ${(p) => p.theme.space.md};
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

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
  const statusMap = useFlowStatusMap(); // N130 — per-flow badge styling
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
    // N260 — bordered board; the columns row scrolls sideways inside ScrollShadow
    // (edge fades, no scrollbar). `.kanban` no longer owns overflow.
    <BoardFrame aria-label="Ticket board">
      <ScrollShadow>
        <div className="kanban">
          {rendered.map((col) => {
            const colTasks = tasks.filter((t) => col.matches.includes(t.status));
            const color = statusHeaderColor(col);
            return (
              <div className="column" key={col.key}>
                <div className="column-header">
                  <span style={{ color }}>{col.label}</span>
                  <span
                    className="column-count"
                    // N260 — tinted background carries the status hue; the numeral
                    // uses --text so small-size contrast passes AA (the status hex
                    // at 11px was borderline for purple/red).
                    style={{ background: `rgba(${hexToRgb(color)},0.18)`, color: "var(--text)" }}
                  >
                    {colTasks.length}
                  </span>
                </div>
                {colTasks.length === 0 ? (
                  <div className="empty">No tasks</div>
                ) : (
                  colTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      statuses={statusMap[t.flowId ?? "default"]}
                      onOpen={onOpen}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </ScrollShadow>
    </BoardFrame>
  );
}

interface TimelineEvent {
  taskId: string;
  status: string;
  // N263 — the previous status of the SAME task (undefined for its first entry),
  // so a row can show the from→to transition.
  from?: string;
  at: string;
  by?: string;
  flowId: string;
}

// N263 — "Lifecycle" pane: the cross-task status-transition timeline (all tasks'
// statusHistory merged, newest first, cap 30) restyled to match the Lovable design
// — a rail with status-colored dots + from→to Badges + a "Current" marker. Reuses
// the N262 .act-stream* rail/dot/header CSS.
export function Timeline({ tasks }: { tasks: Task[] }) {
  const statusMap = useFlowStatusMap(); // N130 — per-flow status color/label
  const events: TimelineEvent[] = [];
  for (const t of tasks) {
    const history = t.statusHistory || [];
    history.forEach((h, idx) => {
      events.push({
        taskId: t.id,
        status: h.status,
        from: idx > 0 ? history[idx - 1].status : undefined,
        at: h.at,
        by: h.by,
        flowId: t.flowId ?? "default",
      });
    });
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

  const shown = events.slice(0, 30);
  return (
    <div className="act-stream-wrap lifecycle">
      <header className="act-stream-head">
        <span className="act-stream-live">Lifecycle</span>
        <span className="act-stream-count">
          {shown.length}
          {events.length > shown.length ? `/${events.length}` : ""} transitions
        </span>
      </header>
      <ol className="act-stream">
        {shown.map((e, i) => {
          const flowStatuses = statusMap[e.flowId];
          const color = statusColor(e.status, flowStatuses) ?? taskStatusColor(e.status);
          return (
            <li className="act-stream-item" key={e.taskId + e.at + i}>
              <span
                className="act-stream-dot"
                aria-hidden="true"
                style={{ background: `rgba(${hexToRgb(color)},0.25)`, borderColor: color }}
              />
              <div className="act-stream-row">
                {e.from ? (
                  <>
                    <Badge status={e.from} statuses={flowStatuses} size="md" />
                    <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>
                      →
                    </span>
                  </>
                ) : null}
                <Badge status={e.status} statuses={flowStatuses} size="md" />
                {i === 0 ? <span className="lifecycle-current">Current</span> : null}
                <span className="act-stream-time">{formatTime(e.at)}</span>
              </div>
              <p className="act-stream-target">
                {e.taskId} · by {e.by || "?"}
              </p>
            </li>
          );
        })}
      </ol>
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
  // N260 — clamp so the pre-load state (current null → idx -1) reads "Page 1", not 0.
  const page = Math.max(1, idx + 1);
  return (
    // N260 — "Ticket Board" header: title left, Newer/page-chip/Older right.
    // Pages are shards (newest first); page = idx+1, total = shards.length.
    <div className="shard-nav">
      <span className="board-title">
        Ticket Board · Page {page} of {shards.length}
      </span>
      <div className="shard-controls">
        <Button $variant="nav" disabled={idx <= 0} onClick={() => onSelect(shards[idx - 1])}>
          <ArrowLeftIcon size={14} />
          Newer
        </Button>
        <Chip>
          {page}/{shards.length}
        </Chip>
        <Button
          $variant="nav"
          disabled={idx >= shards.length - 1}
          onClick={() => onSelect(shards[idx + 1])}
        >
          Older
          <ArrowRightIcon size={14} />
        </Button>
      </div>
    </div>
  );
}
