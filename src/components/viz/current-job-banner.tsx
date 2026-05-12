import type { Task } from "@/lib/task-types";
import { StatusBadge } from "./status-badge";
import { Activity, GitBranch, ExternalLink, Clock, User, Bot, Siren, FileCode } from "lucide-react";

interface Props {
  currentTaskId?: string | null;
  tasks: Task[];
  onOpen: (id: string) => void;
}

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function CurrentJobBanner({ currentTaskId, tasks, onOpen }: Props) {
  const task = tasks.find((t) => t.id === currentTaskId) ?? null;

  if (!task) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          No current job set in <code className="text-foreground">meta.currentTaskId</code>.
        </div>
      </div>
    );
  }

  const lastStatus = task.statusHistory[task.statusHistory.length - 1];
  const fixRounds = task.reviews.filter((r) => r.verdict === "fix-needed").length;
  const lastReview = task.reviews[task.reviews.length - 1];
  const openIncidents = (task.incidents ?? []).filter(
    (i) => i.status !== "closed" && i.status !== "verified" && i.status !== "fixed",
  ).length;

  return (
    <section
      aria-label="Current job"
      className="relative overflow-hidden rounded-lg border border-border bg-card"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 10%, var(--color-card)) 0%, var(--color-card) 60%)",
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: `var(--color-status-${
          lastStatus?.status === "in-progress" || lastStatus?.status === "implemented"
            ? "progress"
            : lastStatus?.status === "fix-needed" || lastStatus?.status === "fixing"
              ? "fix"
              : lastStatus?.status === "reviewing"
                ? "review"
                : lastStatus?.status === "approved" || lastStatus?.status === "fixed"
                  ? "approved"
                  : lastStatus?.status ?? "ready"
        })` }}
      />
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
              <Activity className="h-3 w-3" /> current job
            </span>
            <span className="font-mono text-[11px] text-primary">{task.id}</span>
            <StatusBadge status={task.status as string} />
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {task.type}
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {task.priority}
            </span>
            {fixRounds > 0 && (
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--color-status-fix)]">
                ⚠ {fixRounds} fix
              </span>
            )}
            {openIncidents > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--color-status-fix)]">
                <Siren className="h-3 w-3" /> {openIncidents} open
              </span>
            )}
          </div>

          <h2 className="mt-1.5 truncate text-[15px] font-medium leading-snug text-foreground">
            {task.title}
          </h2>

          {task.folder && (
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {task.folder}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-accent/40 px-1.5 py-0.5 font-mono text-[10px] text-accent-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastStatus ? `${lastStatus.status} · ${timeAgo(lastStatus.at)}` : "—"}
            </span>
            {lastStatus?.by && (
              <span className="flex items-center gap-1">
                {lastStatus.by.includes("human") ? (
                  <User className="h-3 w-3" />
                ) : (
                  <Bot className="h-3 w-3" />
                )}
                {lastStatus.by}
              </span>
            )}
            <span className="flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              {task.implementation.filesChanged.length} files
            </span>
            <span>{task.reviews.length} reviews</span>
            <span>{task.pushes?.length ?? 0} commits</span>
          </div>

          {lastReview?.comment && (
            <p className="mt-2 line-clamp-2 border-l-2 border-border pl-2 text-[12px] italic text-muted-foreground">
              “{lastReview.comment}”
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 lg:items-end">
          {task.branch && (
            <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              <span className="truncate max-w-[260px]">{task.branch}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {task.mrUrl && (
              <a
                href={task.mrUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-2.5 py-1.5 font-mono text-[11px] text-foreground transition hover:bg-accent"
              >
                <ExternalLink className="h-3 w-3" /> MR
              </a>
            )}
            <button
              onClick={() => onOpen(task.id)}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1.5 font-mono text-[11px] text-primary transition hover:bg-primary/25"
            >
              Inspect →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
