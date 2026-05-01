import type { Task } from "@/lib/task-types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "./status-badge";
import { ExternalLink, GitBranch, FileCode, MessageSquare, Bot, User } from "lucide-react";

interface Props {
  task: Task | null;
  onClose: () => void;
}

function fmt(t?: string | null) {
  if (!t) return "—";
  return new Date(t).toLocaleString();
}

export function TaskDetailSheet({ task, onClose }: Props) {
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-background sm:max-w-2xl">
        {task && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary">{task.id}</span>
                <StatusBadge status={task.status as string} />
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                  {task.type}
                </span>
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                  {task.priority}
                </span>
              </div>
              <SheetTitle className="text-left text-base text-foreground">
                {task.title}
              </SheetTitle>
              <div className="flex flex-wrap gap-1 pt-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-accent/40 px-1.5 py-0.5 font-mono text-[10px] text-accent-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              {task.mrUrl && (
                <a
                  href={task.mrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                >
                  <GitBranch className="h-3 w-3" /> {task.branch}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <section>
                <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Status history ({task.statusHistory.length})
                </h4>
                <ol className="relative space-y-2 border-l border-border pl-4">
                  {task.statusHistory.map((h, i) => (
                    <li key={i} className="relative">
                      <span
                        className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background"
                        style={{
                          backgroundColor: `var(--color-status-${
                            h.status === "in-progress" || h.status === "implemented"
                              ? "progress"
                              : h.status === "fix-needed" || h.status === "fixing"
                                ? "fix"
                                : h.status === "fixed" || h.status === "approved"
                                  ? "approved"
                                  : h.status === "reviewing"
                                    ? "review"
                                    : h.status
                          })`,
                        }}
                      />
                      <div className="flex items-baseline justify-between gap-2">
                        <StatusBadge status={h.status} />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {fmt(h.at)}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        by {h.by}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {task.reviews.length > 0 && (
                <section>
                  <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Reviews ({task.reviews.length})
                  </h4>
                  <div className="space-y-2">
                    {task.reviews.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border bg-card p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              #{i + 1}
                            </span>
                            <StatusBadge status={r.verdict} />
                            {r.type === "ai" ? (
                              <Bot className="h-3 w-3 text-muted-foreground" />
                            ) : r.type === "human" ? (
                              <User className="h-3 w-3 text-muted-foreground" />
                            ) : null}
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {r.by}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {fmt(r.endedAt)}
                          </span>
                        </div>
                        <p className="mt-2 flex gap-2 text-[12px] text-foreground">
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          {r.comment}
                        </p>
                        {r.fix && (
                          <div className="mt-2 rounded border border-border bg-background/40 p-2">
                            <div className="font-mono text-[10px] uppercase text-[color:var(--color-status-fix)]">
                              fix · {r.fix.by}
                            </div>
                            <p className="mt-1 text-[12px] text-foreground">{r.fix.comment}</p>
                            {r.fix.filesChanged.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5">
                                {r.fix.filesChanged.map((f) => (
                                  <li
                                    key={f}
                                    className="truncate font-mono text-[10px] text-muted-foreground"
                                  >
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {task.implementation.filesChanged.length > 0 && (
                <section>
                  <h4 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <FileCode className="h-3 w-3" /> Files changed
                  </h4>
                  <ul className="space-y-0.5 rounded-md border border-border bg-card p-2">
                    {task.implementation.filesChanged.map((f) => (
                      <li key={f} className="truncate font-mono text-[11px] text-foreground">
                        {f}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {task.pushes && task.pushes.length > 0 && (
                <section>
                  <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Commits ({task.pushes.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {task.pushes.map((p) => (
                      <li
                        key={p.commitHash}
                        className="rounded-md border border-border bg-card p-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-primary">
                            {p.commitHash}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {fmt(p.at)}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] text-foreground">{p.commitMessage}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
