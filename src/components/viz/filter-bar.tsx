import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Task } from "@/lib/task-types";

interface Props {
  tasks: Task[];
  query: string;
  setQuery: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  tag: string;
  setTag: (s: string) => void;
  type: string;
  setType: (s: string) => void;
}

export function FilterBar({ tasks, query, setQuery, status, setStatus, tag, setTag, type, setType }: Props) {
  const allTags = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => t.tags.forEach((tg) => s.add(tg)));
    return [...s].sort();
  }, [tasks]);
  const allStatuses = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => s.add(t.status as string));
    return [...s].sort();
  }, [tasks]);

  const select =
    "rounded-md border border-border bg-card px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, id, tag, file, commit…"
          className="w-full rounded-md border border-border bg-card py-1.5 pl-8 pr-8 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <select className={select} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">all status</option>
        {allStatuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select className={select} value={type} onChange={(e) => setType(e.target.value)}>
        <option value="">all type</option>
        <option value="fix">fix</option>
        <option value="feat">feat</option>
      </select>
      <select className={select} value={tag} onChange={(e) => setTag(e.target.value)}>
        <option value="">all tags</option>
        {allTags.map((t) => (
          <option key={t} value={t}>#{t}</option>
        ))}
      </select>
    </div>
  );
}

export function filterTasks(
  tasks: Task[],
  query: string,
  status: string,
  tag: string,
  type: string,
): Task[] {
  const q = query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (status && t.status !== status) return false;
    if (type && t.type !== type) return false;
    if (tag && !t.tags.includes(tag)) return false;
    if (!q) return true;
    if (t.id.toLowerCase().includes(q)) return true;
    if (t.title.toLowerCase().includes(q)) return true;
    if (t.tags.some((x) => x.toLowerCase().includes(q))) return true;
    if (t.implementation.filesChanged.some((f) => f.toLowerCase().includes(q))) return true;
    if (t.pushes?.some((p) => p.commitMessage.toLowerCase().includes(q))) return true;
    if (t.reviews.some((r) => r.comment.toLowerCase().includes(q))) return true;
    return false;
  });
}
