import type { Task } from "@/lib/task-types";
import { KANBAN_COLUMNS } from "@/lib/task-types";
import { StatusBadge } from "./status-badge";
import { GitBranch, FileCode, Siren } from "lucide-react";

interface Props {
  tasks: Task[];
  onSelect: (id: string) => void;
}

export function PipelineKanban({ tasks, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KANBAN_COLUMNS.map((col) => {
        const items = tasks.filter((t) => col.matches.includes(t.status as string));
        return (
          <div key={col.key} className="flex flex-col rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {col.label}
              </span>
              <span className="font-mono text-[11px] text-foreground">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {items.map((t) => {
                const fixRounds = t.reviews.filter((r) => r.verdict === "fix-needed").length;
                const incidents = t.incidents?.length ?? 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className="rounded-md border border-border bg-background/40 p-2 text-left transition hover:border-primary/40 hover:bg-accent/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-primary">{t.id}</span>
                      <StatusBadge status={t.status as string} />
                    </div>
                    <div className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-foreground">
                      {t.title}
                    </div>
                    <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileCode className="h-3 w-3" />
                        {t.implementation.filesChanged.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {t.pushes?.length ?? 0}
                      </span>
                      {fixRounds > 0 && (
                        <span className="text-[color:var(--color-status-fix)]">
                          ⚠ {fixRounds} fix
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {items.length === 0 && (
                <div className="py-4 text-center font-mono text-[10px] text-muted-foreground">
                  empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
