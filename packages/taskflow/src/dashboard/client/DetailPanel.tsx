import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { DocName } from "./api.js";
import { fetchTaskDoc } from "./api.js";
import type { Implementation, Incident, Push, Review, StatusHistoryEntry, Task } from "./lib.js";
import { formatTime } from "./lib.js";
import { Badge, Button, Chip, Section, Severity, Text } from "./components/index.js";

function FileChips({ files }: { files?: string[] }) {
  if (!files || !files.length) return null;
  return (
    <div className="files">
      {files.map((f, i) => (
        <Chip key={f + i}>{f}</Chip>
      ))}
    </div>
  );
}

function Info({ task }: { task: Task }) {
  return (
    <dl className="kv">
      <dt>Type</dt>
      <dd>
        <span className="mono">{task.type}</span>
      </dd>
      <dt>Priority</dt>
      <dd>
        <span className="mono">{task.priority}</span>
      </dd>
      <dt>Status</dt>
      <dd>
        <Badge status={task.status} />
      </dd>
      <dt>Created</dt>
      <dd>
        <span className="muted">{formatTime(task.createdAt)}</span>
      </dd>
      <dt>Folder</dt>
      <dd>
        <span className="mono">{task.folder || "—"}</span>
      </dd>
      <dt>Branch</dt>
      <dd>
        {task.branch ? (
          <span className="mono">{task.branch}</span>
        ) : (
          <span className="muted">—</span>
        )}
      </dd>
      <dt>Tags</dt>
      <dd>
        {task.tags && task.tags.length ? (
          task.tags.map((x) => <Chip key={x}>#{x}</Chip>)
        ) : (
          <span className="muted">—</span>
        )}
      </dd>
      <dt>PR</dt>
      <dd>
        {task.mrUrl ? (
          <a href={task.mrUrl} target="_blank" rel="noopener noreferrer">
            {task.mrUrl}
          </a>
        ) : (
          <span className="muted">—</span>
        )}
      </dd>
    </dl>
  );
}

function ImplementationView({ impl }: { impl?: Implementation }) {
  if (!impl) return <div className="empty">Not started</div>;
  const minutes =
    impl.startedAt && impl.completedAt
      ? Math.round(
          (new Date(impl.completedAt).getTime() - new Date(impl.startedAt).getTime()) / 60000,
        )
      : null;
  return (
    <dl className="kv">
      <dt>Started</dt>
      <dd>{impl.startedAt ? formatTime(impl.startedAt) : <span className="muted">—</span>}</dd>
      <dt>Completed</dt>
      <dd>{impl.completedAt ? formatTime(impl.completedAt) : <span className="muted">—</span>}</dd>
      <dt>Duration</dt>
      <dd>
        {minutes !== null ? (
          <span className="mono">{minutes} min</span>
        ) : (
          <span className="muted">—</span>
        )}
      </dd>
      <dt>Tokens</dt>
      <dd>
        {impl.tokensUsed ? (
          <span className="mono">{impl.tokensUsed.toLocaleString()}</span>
        ) : (
          <span className="muted">—</span>
        )}
      </dd>
      <dt>Files</dt>
      <dd>
        {impl.filesChanged && impl.filesChanged.length ? (
          <FileChips files={impl.filesChanged} />
        ) : (
          <span className="muted">none</span>
        )}
      </dd>
    </dl>
  );
}

function ReviewItem({ review, round }: { review: Review; round: number }) {
  const verdict = review.verdict || "pending";
  const fixMinutes =
    review.fix && review.fix.startedAt && review.fix.endedAt
      ? Math.round(
          (new Date(review.fix.endedAt).getTime() - new Date(review.fix.startedAt).getTime()) /
            60000,
        )
      : null;
  return (
    <div className="item">
      <div className="item-head">
        <strong>Round {round}</strong>
        <Badge status={verdict} />
        <span className="who">{(review.type || "ai") + " · " + (review.by || "?")}</span>
        <span className="when">
          {formatTime(review.startedAt)}
          {review.endedAt ? " → " + formatTime(review.endedAt) : ""}
        </span>
      </div>
      {review.comment ? (
        <div className="item-body">
          <div className="comment">{review.comment}</div>
        </div>
      ) : null}
      {review.fix ? (
        <>
          <div className="item-foot">
            <span>
              fix: <Badge status={review.fix.status || ""} />
            </span>
            <span className="who">by {review.fix.by || "?"}</span>
            {fixMinutes !== null ? <span>{fixMinutes} min</span> : null}
          </div>
          {review.fix.comment ? (
            <div className="item-body">
              <div className="comment">{review.fix.comment}</div>
            </div>
          ) : null}
          <FileChips files={review.fix.filesChanged} />
        </>
      ) : null}
    </div>
  );
}

function IncidentItem({ inc }: { inc: Incident }) {
  return (
    <div className="item">
      <div className="item-head">
        <strong>{inc.id}</strong> — {inc.title}
      </div>
      <dl className="kv">
        <dt>Severity</dt>
        <dd>
          <Severity $level={inc.severity || "medium"}>{inc.severity || "medium"}</Severity>
        </dd>
        <dt>Status</dt>
        <dd>
          <Badge status={inc.status} />
        </dd>
        <dt>Reported</dt>
        <dd>{formatTime(inc.reportedAt)}</dd>
        <dt>Resolved</dt>
        <dd>{inc.resolvedAt ? formatTime(inc.resolvedAt) : <span className="muted">—</span>}</dd>
        {inc.branch ? (
          <>
            <dt>Branch</dt>
            <dd>
              <span className="mono">{inc.branch}</span>
            </dd>
          </>
        ) : null}
      </dl>
      {inc.description ? (
        <div className="item-body">
          <div className="comment">{inc.description}</div>
        </div>
      ) : null}
      {inc.rootCause ? (
        <div className="item-body" style={{ marginTop: 8 }}>
          <strong style={{ fontSize: 11, color: "var(--text-muted)" }}>ROOT CAUSE</strong>
          <div className="comment">{inc.rootCause}</div>
        </div>
      ) : null}
      {inc.fix ? (
        <div className="item-body" style={{ marginTop: 8 }}>
          <strong style={{ fontSize: 11, color: "var(--text-muted)" }}>FIX</strong>
          <div className="comment">{inc.fix}</div>
        </div>
      ) : null}
    </div>
  );
}

function PushItem({ push }: { push: Push }) {
  return (
    <div className="commit">
      <span className="hash">{(push.commitHash || "").slice(0, 8)}</span>
      <span className="msg">{push.commitMessage || ""}</span>
      <span className="when">{formatTime(push.at)}</span>
    </div>
  );
}

function StatusHistory({ hist }: { hist?: StatusHistoryEntry[] }) {
  if (!hist || !hist.length) return <div className="empty">No history</div>;
  return (
    <div className="timeline-mini">
      {hist
        .slice()
        .reverse()
        .map((h, i) => (
          <div className="timeline-mini-item" key={h.at + i}>
            <span className="t-when">{formatTime(h.at)}</span>
            <Badge status={h.status} />
            <span className="t-who">by {h.by || "?"}</span>
          </div>
        ))}
    </div>
  );
}

const DOC_TABS: DocName[] = ["TASK", "CHECKLIST", "REVIEW", "ANALYSIS"];

function DocViewer({ folder }: { folder: string }) {
  const [active, setActive] = useState<DocName>("TASK");
  const [content, setContent] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setContent(null);
    fetchTaskDoc(folder, active)
      .then((md) => {
        if (cancelled) return;
        if (md === null) {
          setState("missing");
        } else {
          setContent(md);
          setState("ok");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [folder, active]);

  return (
    <div>
      <div className="doc-tabs">
        {DOC_TABS.map((name) => (
          <Button
            key={name}
            $variant="docTab"
            $active={active === name}
            onClick={() => setActive(name)}
          >
            {name}
          </Button>
        ))}
      </div>
      {state === "loading" ? (
        <div className="empty">Loading…</div>
      ) : state === "missing" ? (
        <div className="empty">No {active}.md for this task.</div>
      ) : state === "error" ? (
        <div className="empty">Failed to load {active}.md.</div>
      ) : (
        <div className="markdown-body">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {content || ""}
          </Markdown>
        </div>
      )}
    </div>
  );
}

export function DetailPanel({ task, onClose }: { task: Task | null; onClose: () => void }) {
  return (
    <>
      <div className={"detail-overlay" + (task ? " open" : "")} onClick={onClose} />
      {task ? (
        <div className="detail-panel">
          <Button $variant="close" type="button" onClick={onClose}>
            ×
          </Button>
          <div>
            <Text as="h2" $variant="h2">
              {task.id} — {task.title}
            </Text>
            <Section title="Info">
              <Info task={task} />
            </Section>
            <Section title="Implementation">
              <ImplementationView impl={task.implementation} />
            </Section>
            {task.reviews && task.reviews.length ? (
              <Section title="Reviews" count={task.reviews.length}>
                <div className="item-list">
                  {task.reviews.map((r, i) => (
                    <ReviewItem key={i} review={r} round={i + 1} />
                  ))}
                </div>
              </Section>
            ) : null}
            {task.pushes && task.pushes.length ? (
              <Section title="Pushes" count={task.pushes.length}>
                <div className="commit-list">
                  {task.pushes.map((p, i) => (
                    <PushItem key={i} push={p} />
                  ))}
                </div>
              </Section>
            ) : null}
            {task.incidents && task.incidents.length ? (
              <Section title="Incidents" count={task.incidents.length}>
                <div className="item-list">
                  {task.incidents.map((inc) => (
                    <IncidentItem key={inc.id} inc={inc} />
                  ))}
                </div>
              </Section>
            ) : null}
            <Section title="Status history" count={(task.statusHistory || []).length}>
              <StatusHistory hist={task.statusHistory} />
            </Section>
            {task.folder ? (
              <Section title="Documents">
                <DocViewer folder={task.folder} />
              </Section>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
