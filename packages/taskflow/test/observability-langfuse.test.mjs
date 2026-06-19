/**
 * N157 — opt-in Langfuse observability exporter.
 *
 * Covers the parts that run without the (optional) `langfuse` SDK installed:
 *   - the pure Task→trace/spans/scores mapping (deterministic ids),
 *   - the config gate (disabled by default; malformed = disabled),
 *   - credential resolution (config-first, env-fallback),
 *   - the disabled path is a genuine no-op that never throws and flushes clean.
 *
 * The enabled SDK path is verified manually against a live Langfuse (see the
 * task's Verification) — the package isn't a hard dependency, so it can't be
 * exercised here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLangfusePayload,
  isLangfuseEnabled,
  resolveLangfuseCreds,
  recordTaskLifecycle,
  recordHookEvent,
  flushObservability,
} from "../dist/index.js";

function makeTask(overrides = {}) {
  return {
    id: "N42",
    title: "Example task",
    type: "feat",
    priority: "high",
    status: "implemented",
    folder: "insightFlow/workTasks/N42-example",
    createdAt: "2026-06-19T10:00:00.000Z",
    statusHistory: [],
    implementation: {
      startedAt: "2026-06-19T10:05:00.000Z",
      completedAt: "2026-06-19T10:30:00.000Z",
      filesChanged: ["a.ts", "b.ts"],
      tokensUsed: 1234,
    },
    changesAfterImplementation: [],
    committedAt: null,
    totalDurationMinutes: null,
    tags: ["observability", "langfuse"],
    pushes: [],
    branch: null,
    mrUrl: null,
    mergedAt: null,
    flowId: "default",
    ...overrides,
  };
}

const reviews = [
  {
    startedAt: "2026-06-19T11:00:00.000Z",
    endedAt: "2026-06-19T11:20:00.000Z",
    verdict: "fix-needed",
    comment: "one blocker",
    type: "ai",
    by: "task-review",
    fix: {
      startedAt: "2026-06-19T11:30:00.000Z",
      endedAt: "2026-06-19T11:45:00.000Z",
      status: "fixed",
      filesChanged: ["a.ts"],
      comment: null,
      by: "task-review-fix",
    },
  },
  {
    startedAt: "2026-06-19T12:00:00.000Z",
    endedAt: "2026-06-19T12:10:00.000Z",
    verdict: "approved",
    comment: null,
    type: "ai",
    by: "task-review",
    fix: null,
  },
];

test("buildLangfusePayload: Task → trace with id, name, tags, metadata", () => {
  const { trace } = buildLangfusePayload(makeTask());
  assert.equal(trace.id, "N42");
  assert.equal(trace.name, "N42 Example task");
  assert.equal(trace.timestamp, "2026-06-19T10:00:00.000Z");
  assert.deepEqual(trace.tags, ["observability", "langfuse"]);
  assert.equal(trace.metadata.type, "feat");
  assert.equal(trace.metadata.priority, "high");
  assert.equal(trace.metadata.flowId, "default");
  assert.equal(trace.metadata.tokensUsed, 1234);
});

test("buildLangfusePayload: implement phase → one span with deterministic id", () => {
  const { spans } = buildLangfusePayload(makeTask());
  const impl = spans.find((s) => s.id === "N42-implement");
  assert.ok(impl, "implement span present");
  assert.equal(impl.name, "implement");
  assert.equal(impl.startTime, "2026-06-19T10:05:00.000Z");
  assert.equal(impl.endTime, "2026-06-19T10:30:00.000Z");
  assert.equal(impl.metadata.filesChanged, 2);
  assert.equal(impl.metadata.tokensUsed, 1234);
});

test("buildLangfusePayload: each review → a span; its fix → a span", () => {
  const { spans } = buildLangfusePayload(makeTask(), reviews);
  assert.ok(spans.find((s) => s.id === "N42-review-0" && s.name === "review:ai"));
  assert.ok(spans.find((s) => s.id === "N42-review-1"));
  const fix = spans.find((s) => s.id === "N42-fix-0");
  assert.ok(fix, "fix span for the first review present");
  assert.equal(fix.name, "fix");
  // second review had no fix
  assert.equal(
    spans.find((s) => s.id === "N42-fix-1"),
    undefined,
  );
});

test("buildLangfusePayload: review verdicts → scores (approved=1, else 0)", () => {
  const { scores } = buildLangfusePayload(makeTask(), reviews);
  assert.equal(scores.length, 2);
  const v0 = scores.find((s) => s.id === "N42-verdict-0");
  const v1 = scores.find((s) => s.id === "N42-verdict-1");
  assert.equal(v0.value, 0);
  assert.equal(v0.stringValue, "fix-needed");
  assert.equal(v1.value, 1);
  assert.equal(v1.stringValue, "approved");
});

test("buildLangfusePayload: change requests → spans", () => {
  const task = makeTask({
    changesAfterImplementation: [
      {
        requestedAt: "2026-06-19T13:00:00.000Z",
        description: "tweak",
        requestedBy: "owner",
        status: "implemented",
        implementedAt: "2026-06-19T13:30:00.000Z",
        filesChanged: ["c.ts"],
        comment: null,
        implementedBy: "implement-changes",
      },
    ],
  });
  const { spans } = buildLangfusePayload(task);
  const change = spans.find((s) => s.id === "N42-change-0");
  assert.ok(change, "change span present");
  assert.equal(change.name, "change");
  assert.equal(change.metadata.requestedBy, "owner");
});

test("buildLangfusePayload: re-export is deterministic (stable ids for upsert)", () => {
  const a = buildLangfusePayload(makeTask(), reviews);
  const b = buildLangfusePayload(makeTask(), reviews);
  assert.deepEqual(
    a.spans.map((s) => s.id),
    b.spans.map((s) => s.id),
  );
  assert.deepEqual(
    a.scores.map((s) => s.id),
    b.scores.map((s) => s.id),
  );
});

test("isLangfuseEnabled: disabled by default and when block absent/malformed", () => {
  assert.equal(isLangfuseEnabled({}), false);
  assert.equal(isLangfuseEnabled({ observability: {} }), false);
  assert.equal(isLangfuseEnabled({ observability: { langfuse: { enabled: false } } }), false);
  // malformed → treated as disabled, never throws
  assert.equal(isLangfuseEnabled({ observability: { langfuse: "nope" } }), false);
  assert.equal(isLangfuseEnabled({ observability: { langfuse: { enabled: true } } }), true);
});

test("resolveLangfuseCreds: config-first then env; null when no keys", () => {
  assert.equal(resolveLangfuseCreds({ observability: { langfuse: { enabled: true } } }), null);

  const fromConfig = resolveLangfuseCreds({
    observability: {
      langfuse: { enabled: true, publicKey: "pk", secretKey: "sk", host: "http://h" },
    },
  });
  assert.deepEqual(fromConfig, { publicKey: "pk", secretKey: "sk", baseUrl: "http://h" });

  const prev = {
    pk: process.env.LANGFUSE_PUBLIC_KEY,
    sk: process.env.LANGFUSE_SECRET_KEY,
    host: process.env.LANGFUSE_HOST,
  };
  try {
    process.env.LANGFUSE_PUBLIC_KEY = "envpk";
    process.env.LANGFUSE_SECRET_KEY = "envsk";
    process.env.LANGFUSE_HOST = "http://env";
    const fromEnv = resolveLangfuseCreds({ observability: { langfuse: { enabled: true } } });
    assert.deepEqual(fromEnv, { publicKey: "envpk", secretKey: "envsk", baseUrl: "http://env" });
  } finally {
    process.env.LANGFUSE_PUBLIC_KEY = prev.pk;
    process.env.LANGFUSE_SECRET_KEY = prev.sk;
    process.env.LANGFUSE_HOST = prev.host;
  }
});

test("disabled path: record* are no-ops that never throw; flush resolves clean", async () => {
  // No observability config → nothing scheduled, SDK never imported.
  recordTaskLifecycle({}, makeTask(), reviews);
  recordHookEvent(
    {},
    { id: "e1", timestamp: "2026-06-19T10:00:00.000Z", type: "Stop", taskId: "N42" },
  );
  await flushObservability(); // must resolve without throwing
  assert.ok(true);
});

test("enabled but no credentials: record* fail-open (no throw, no scheduling)", async () => {
  const cfg = { observability: { langfuse: { enabled: true } } };
  const prev = { pk: process.env.LANGFUSE_PUBLIC_KEY, sk: process.env.LANGFUSE_SECRET_KEY };
  try {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    recordTaskLifecycle(cfg, makeTask(), reviews);
    await flushObservability();
    assert.ok(true);
  } finally {
    process.env.LANGFUSE_PUBLIC_KEY = prev.pk;
    process.env.LANGFUSE_SECRET_KEY = prev.sk;
  }
});
