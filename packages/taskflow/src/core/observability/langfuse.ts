// N157 — opt-in Langfuse observability exporter.
//
// Maps insight-flow's existing lifecycle signal to Langfuse: each Task → a
// trace, each agent phase (implement / review / fix / change) → a span, and
// each review verdict → a score. Reuses `Task` data already on disk
// (statusHistory, implementation timings, reviews, tokensUsed) — it never
// gathers new signal.
//
// Design rules (from the spec):
//   - DISABLED IS THE DEFAULT. With `observability.langfuse.enabled` unset or
//     false, every entry point returns immediately and the Langfuse SDK is
//     never imported — non-users pay nothing.
//   - LAZY + OPTIONAL DEP. The SDK (`langfuse`) is loaded via dynamic import
//     only when enabled + credentialed. If it isn't installed, we warn once and
//     no-op (so it can be an optional peer dependency).
//   - FAIL-OPEN. Any exporter error is caught and downgraded to a single
//     warning; it must never break a lifecycle command or the event endpoint
//     (same posture as N131/N152).
//   - KEYS NEVER COMMITTED. Credentials resolve config-first, then env
//     (`LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST`).
//
// SDK choice: the classic `langfuse` Node SDK (trace/span/score + flushAsync).
// insight-flow's lifecycle commands are short-lived processes (run then exit),
// which fits the explicit construct → emit → flush model far better than the
// long-running OTEL streaming provider. The whole SDK surface we touch is
// isolated behind the `LangfuseClient` adapter below, so swapping packages
// later is a one-function change.

import type { Task, Review, HookEventInput, TaskflowConfig } from "../types.js";
import { ObservabilityConfigSchema } from "../schema/index.js";

// ---------------------------------------------------------------------------
// Pure mapping (no SDK, no I/O — unit-testable in isolation)
// ---------------------------------------------------------------------------

export interface LangfuseSpanPayload {
  /** Deterministic so repeated lifecycle exports upsert instead of duplicating. */
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  metadata?: Record<string, unknown>;
}

export interface LangfuseScorePayload {
  id: string;
  name: string;
  value: number;
  stringValue?: string;
  comment?: string;
}

export interface LangfuseTracePayload {
  id: string;
  name: string;
  timestamp?: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface LangfusePayload {
  trace: LangfuseTracePayload;
  spans: LangfuseSpanPayload[];
  scores: LangfuseScorePayload[];
}

/** A completed review verdict → a 0..1 score. Unknown verdicts score 0. */
function verdictToScore(verdict: string): number {
  return verdict === "approved" ? 1 : 0;
}

/**
 * Build the full Langfuse payload for a task from data already on disk. Pure:
 * given the same task + reviews it always yields the same (deterministic-id)
 * trace, spans, and scores, so re-exporting at each lifecycle boundary upserts
 * rather than accumulates.
 */
export function buildLangfusePayload(task: Task, reviews: Review[] = []): LangfusePayload {
  const trace: LangfuseTracePayload = {
    id: task.id,
    name: `${task.id} ${task.title}`.trim(),
    timestamp: task.createdAt,
    tags: task.tags ?? [],
    metadata: {
      type: task.type,
      priority: task.priority,
      status: task.status,
      flowId: task.flowId,
      tokensUsed: task.implementation?.tokensUsed ?? null,
      totalDurationMinutes: task.totalDurationMinutes ?? null,
    },
  };

  const spans: LangfuseSpanPayload[] = [];

  // implement phase
  if (task.implementation?.startedAt) {
    spans.push({
      id: `${task.id}-implement`,
      name: "implement",
      startTime: task.implementation.startedAt,
      endTime: task.implementation.completedAt ?? undefined,
      metadata: {
        tokensUsed: task.implementation.tokensUsed ?? null,
        filesChanged: task.implementation.filesChanged?.length ?? 0,
      },
    });
  }

  // review + fix phases (per review round)
  reviews.forEach((review, i) => {
    spans.push({
      id: `${task.id}-review-${i}`,
      name: `review:${review.type}`,
      startTime: review.startedAt,
      endTime: review.endedAt ?? undefined,
      metadata: { verdict: review.verdict, by: review.by },
    });
    if (review.fix?.startedAt) {
      spans.push({
        id: `${task.id}-fix-${i}`,
        name: "fix",
        startTime: review.fix.startedAt,
        endTime: review.fix.endedAt ?? undefined,
        metadata: {
          status: review.fix.status,
          filesChanged: review.fix.filesChanged?.length ?? 0,
          by: review.fix.by,
        },
      });
    }
  });

  // change phases (post-implementation change requests)
  (task.changesAfterImplementation ?? []).forEach((change, i) => {
    spans.push({
      id: `${task.id}-change-${i}`,
      name: "change",
      startTime: change.requestedAt,
      endTime: change.implementedAt ?? undefined,
      metadata: { status: change.status, requestedBy: change.requestedBy },
    });
  });

  // verdict scores
  const scores: LangfuseScorePayload[] = [];
  reviews.forEach((review, i) => {
    if (review.verdict) {
      scores.push({
        id: `${task.id}-verdict-${i}`,
        name: "review-verdict",
        value: verdictToScore(review.verdict),
        stringValue: review.verdict,
        comment: review.comment ?? undefined,
      });
    }
  });

  return { trace, spans, scores };
}

// ---------------------------------------------------------------------------
// Config gate + credential resolution
// ---------------------------------------------------------------------------

export interface LangfuseCreds {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
}

/**
 * Enabled iff the (defensively parsed) `observability.langfuse.enabled` is
 * true. A malformed block is treated as disabled — never throws.
 */
export function isLangfuseEnabled(config: TaskflowConfig): boolean {
  const parsed = ObservabilityConfigSchema.safeParse(config.observability);
  return parsed.success && parsed.data.langfuse?.enabled === true;
}

/** Config-first, env-fallback credential resolution. Null ⇒ cannot export. */
export function resolveLangfuseCreds(config: TaskflowConfig): LangfuseCreds | null {
  const parsed = ObservabilityConfigSchema.safeParse(config.observability);
  const lf = parsed.success ? parsed.data.langfuse : undefined;
  const publicKey = lf?.publicKey || process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = lf?.secretKey || process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = lf?.host || process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASEURL;
  if (!publicKey || !secretKey) return null;
  return { publicKey, secretKey, baseUrl };
}

// ---------------------------------------------------------------------------
// SDK adapter (the only place the real `langfuse` package is touched)
// ---------------------------------------------------------------------------

interface LangfuseTrace {
  span(opts: {
    id?: string;
    name: string;
    startTime?: Date;
    endTime?: Date;
    metadata?: Record<string, unknown>;
  }): unknown;
  event(opts: {
    id?: string;
    name: string;
    startTime?: Date;
    metadata?: Record<string, unknown>;
  }): unknown;
}

interface LangfuseClient {
  trace(opts: {
    id?: string;
    name?: string;
    metadata?: Record<string, unknown>;
    timestamp?: Date;
    tags?: string[];
  }): LangfuseTrace;
  score(opts: {
    id?: string;
    traceId: string;
    name: string;
    value: number;
    comment?: string;
    dataType?: string;
  }): unknown;
  flushAsync(): Promise<void>;
}

type LangfuseModule = {
  Langfuse: new (opts: {
    publicKey: string;
    secretKey: string;
    baseUrl?: string;
  }) => LangfuseClient;
};

let warned = false;
function warnOnce(message: string): void {
  if (warned) return;
  warned = true;
  console.error(`warning: Langfuse observability — ${message} Exporter disabled for this run.`);
}

let clientPromise: Promise<LangfuseClient | null> | null = null;

/** Lazily import + construct (and cache) the SDK client. Null = unavailable. */
function getClient(creds: LangfuseCreds): Promise<LangfuseClient | null> {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    try {
      // Non-literal specifier on purpose: `langfuse` is an OPTIONAL peer dep, so
      // it must not be resolved/typechecked at build time (it's usually absent).
      // The dynamic import yields `any`; we narrow it through the LangfuseModule
      // adapter, the single place the real package's shape is assumed.
      const pkg = "langfuse";
      const mod = (await import(pkg)) as unknown as LangfuseModule;
      return new mod.Langfuse({
        publicKey: creds.publicKey,
        secretKey: creds.secretKey,
        baseUrl: creds.baseUrl,
      });
    } catch {
      warnOnce("the optional 'langfuse' package is not installed (`npm i langfuse`).");
      return null;
    }
  })();
  return clientPromise;
}

// In-flight async sends; each removes itself on settle so the set stays bounded
// in a long-running server. `flushObservability` awaits a snapshot of these.
const inFlight = new Set<Promise<unknown>>();
function track(op: Promise<unknown>): void {
  const wrapped = op.catch((err) => warnOnce(`export failed (${(err as Error).message}).`));
  inFlight.add(wrapped);
  void wrapped.finally(() => inFlight.delete(wrapped));
}

function toDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/**
 * Export a task's full lifecycle as a Langfuse trace + phase spans + verdict
 * scores. No-op when disabled or uncredentialed. Schedules the send (tracked
 * for `flushObservability`); never throws.
 */
export function recordTaskLifecycle(
  config: TaskflowConfig,
  task: Task,
  reviews: Review[] = [],
): void {
  if (!isLangfuseEnabled(config)) return;
  const creds = resolveLangfuseCreds(config);
  if (!creds) {
    warnOnce("enabled but no credentials (set publicKey/secretKey in config or env).");
    return;
  }
  const payload = buildLangfusePayload(task, reviews);
  track(
    getClient(creds).then((client) => {
      if (!client) return;
      const trace = client.trace({
        id: payload.trace.id,
        name: payload.trace.name,
        metadata: payload.trace.metadata,
        timestamp: toDate(payload.trace.timestamp),
        tags: payload.trace.tags,
      });
      for (const span of payload.spans) {
        trace.span({
          id: span.id,
          name: span.name,
          startTime: toDate(span.startTime),
          endTime: toDate(span.endTime),
          metadata: span.metadata,
        });
      }
      for (const score of payload.scores) {
        client.score({
          id: score.id,
          traceId: payload.trace.id,
          name: score.name,
          value: score.value,
          comment: score.stringValue
            ? `${score.stringValue}${score.comment ? ` — ${score.comment}` : ""}`
            : score.comment,
        });
      }
    }),
  );
}

/**
 * Record a single hook lifecycle event (from `POST /log/events`) as an event
 * on its task's trace. Only fires when the event carries a `taskId`
 * (session-level noise without a task is skipped). No-op when disabled; never
 * throws. Fire-and-forget — the long-running server relies on the SDK's own
 * background flushing.
 */
export function recordHookEvent(config: TaskflowConfig, event: HookEventInput): void {
  if (!isLangfuseEnabled(config)) return;
  if (!event.taskId) return;
  const creds = resolveLangfuseCreds(config);
  if (!creds) {
    warnOnce("enabled but no credentials (set publicKey/secretKey in config or env).");
    return;
  }
  const taskId = event.taskId;
  track(
    getClient(creds).then((client) => {
      if (!client) return;
      const trace = client.trace({ id: taskId });
      trace.event({
        id: event.id,
        name: event.type,
        startTime: toDate(event.timestamp),
        metadata: event.payload,
      });
    }),
  );
}

/**
 * Await in-flight exports and flush the SDK. Called once at the end of a CLI
 * run so short-lived processes deliver before exit. No-op when nothing was
 * scheduled (disabled path) or the SDK never loaded.
 */
export async function flushObservability(): Promise<void> {
  if (inFlight.size > 0) {
    await Promise.allSettled(Array.from(inFlight));
  }
  if (!clientPromise) return;
  try {
    const client = await clientPromise;
    await client?.flushAsync();
  } catch {
    // fail-open: a flush failure must not fail the command that triggered it
  }
}
