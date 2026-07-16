import { useEffect, useState } from "react";
import styled from "styled-components";
import { fetchLogs, fetchProjects, type LogEntry } from "./api.js";

// N244 — a raw-JSON debug log viewer at /logs. Reads GET /api/logs (N242),
// filters by project + level, paginates. Intentionally plain (Lovable styles
// later); the priority is showing every field of each entry.

const PAGE_SIZE = 100;

const Wrap = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: ${(p) => p.theme.space.xl} ${(p) => p.theme.space.lg};
  color: ${(p) => p.theme.color.text};
`;
const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => p.theme.space.md};
  margin-bottom: ${(p) => p.theme.space.xl};
`;
const Back = styled.a`
  color: ${(p) => p.theme.color.textMuted};
  text-decoration: none;
  font-size: ${(p) => p.theme.font.size.sm};
  &:hover {
    color: ${(p) => p.theme.color.text};
  }
`;
const H1 = styled.h1`
  margin: 4px 0 0;
  font-size: ${(p) => p.theme.font.size.xl};
`;
const Filters = styled.div`
  display: flex;
  gap: ${(p) => p.theme.space.sm};
  select {
    background: ${(p) => p.theme.color.surface};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.md};
    padding: 6px 10px;
    font-size: ${(p) => p.theme.font.size.sm};
  }
`;
const Note = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  padding: ${(p) => p.theme.space.lg} 0;
`;
const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.sm};
`;
const LEVEL: Record<string, string> = {
  error: "#f87171",
  warning: "#fbbf24",
  info: "#60a5fa",
};
const Row = styled.div<{ $level: string }>`
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-left: 3px solid ${(p) => LEVEL[p.$level] ?? p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.md};
  padding: ${(p) => p.theme.space.md};
`;
const RowHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${(p) => p.theme.space.sm};
  font-size: ${(p) => p.theme.font.size.sm};
`;
const Badge = styled.span<{ $level: string }>`
  color: ${(p) => LEVEL[p.$level] ?? p.theme.color.text};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.72rem;
`;
const Meta = styled.span`
  color: ${(p) => p.theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`;
const Msg = styled.div`
  margin-top: 6px;
`;
const Pre = styled.pre`
  margin: 8px 0 0;
  padding: 8px 10px;
  background: ${(p) => p.theme.color.bg};
  border-radius: ${(p) => p.theme.radius.sm};
  overflow-x: auto;
  font-size: 0.78rem;
  line-height: 1.45;
`;
const Pager = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  margin-top: ${(p) => p.theme.space.xl};
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.sm};
  button {
    background: ${(p) => p.theme.color.surface};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.md};
    padding: 6px 12px;
    cursor: pointer;
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
`;

export function LogsPage() {
  const [project, setProject] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [projectOpts, setProjectOpts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .then((ps) => setProjectOpts([...new Set(ps.map((p) => p.projectId))]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchLogs({ project, type, page, pageSize: PAGE_SIZE })
      .then((d) => {
        if (cancelled) return;
        setTotal(d.total);
        setLogs(d.logs);
      })
      .catch((e) => !cancelled && setErr(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [project, type, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Wrap>
      <Head>
        <div>
          <Back href="/">← Overview</Back>
          <H1>Debug logs</H1>
        </div>
        <Filters>
          <select
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              setPage(1);
            }}
            aria-label="Project"
          >
            <option value="all">All projects</option>
            <option value="master">master</option>
            {projectOpts.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            aria-label="Level"
          >
            <option value="all">All levels</option>
            <option value="error">error</option>
            <option value="warning">warning</option>
            <option value="info">info</option>
          </select>
        </Filters>
      </Head>

      {err ? <Note>Failed to load logs: {err}</Note> : null}
      {loading ? <Note>Loading…</Note> : null}
      {!loading && !err && logs.length === 0 ? <Note>No logs yet.</Note> : null}

      <List>
        {logs.map((l, i) => (
          <Row key={`${l.timestamp}-${i}`} $level={l.type}>
            <RowHead>
              <Badge $level={l.type}>{l.type}</Badge>
              <Meta>{l.timestamp}</Meta>
              <Meta>· {l.projectName}</Meta>
            </RowHead>
            <Msg>{l.message}</Msg>
            {l.data !== undefined ? <Pre>{JSON.stringify(l.data, null, 2)}</Pre> : null}
          </Row>
        ))}
      </List>

      <Pager>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <span>
          Page {page} / {totalPages} · {total} logs
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </Pager>
    </Wrap>
  );
}
