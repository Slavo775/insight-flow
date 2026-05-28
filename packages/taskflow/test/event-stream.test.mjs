/**
 * Unit tests for N68 status derivation + event store.
 * Run: node test/event-stream.test.mjs (after `pnpm build`)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const { deriveStatus, statusFromEvent, EventStore } = await import(
  fileURLToPath(new URL("../dist/index.js", import.meta.url))
);

function ev(overrides = {}) {
  return {
    id: overrides.id ?? "id_" + Math.random().toString(36).slice(2),
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    type: overrides.type ?? "PreToolUse",
    payload: overrides.payload ?? {},
  };
}

test("statusFromEvent: Stop → done", () => {
  assert.equal(statusFromEvent(ev({ type: "Stop" })), "done");
});

test("statusFromEvent: SubagentStop → done", () => {
  assert.equal(statusFromEvent(ev({ type: "SubagentStop" })), "done");
});

test("statusFromEvent: Notification with permission wording → awaiting-permission", () => {
  assert.equal(
    statusFromEvent(ev({ type: "Notification", payload: { message: "Claude needs your permission to use Bash" } })),
    "awaiting-permission",
  );
});

test("statusFromEvent: Notification without permission wording → idle", () => {
  assert.equal(
    statusFromEvent(ev({ type: "Notification", payload: { message: "Claude is waiting for your input" } })),
    "idle",
  );
});

test("statusFromEvent: any other hook type → active", () => {
  for (const t of ["PreToolUse", "PostToolUse", "UserPromptSubmit", "SessionStart"]) {
    assert.equal(statusFromEvent(ev({ type: t })), "active");
  }
});

test("statusFromEvent: legacy derived names map correctly", () => {
  assert.equal(statusFromEvent(ev({ type: "agent-idle" })), "done");
  assert.equal(statusFromEvent(ev({ type: "approval-required" })), "awaiting-permission");
  assert.equal(statusFromEvent(ev({ type: "tool-requested" })), "active");
});

test("deriveStatus: empty window → idle", () => {
  assert.equal(deriveStatus([]), "idle");
});

test("deriveStatus: latest by timestamp wins", () => {
  const events = [
    ev({ timestamp: "2026-05-28T10:00:00.000Z", type: "PreToolUse" }),
    ev({ timestamp: "2026-05-28T10:00:01.000Z", type: "Stop" }),
  ];
  assert.equal(deriveStatus(events), "done");
});

test("EventStore: status starts at idle", () => {
  const store = new EventStore();
  assert.equal(store.getStatus(), "idle");
});

test("EventStore: transition flips status and reports from/to", () => {
  const store = new EventStore();
  const result = store.insert(ev({ type: "Stop", timestamp: "2026-05-28T10:00:00.000Z" }));
  assert.equal(result.duplicate, false);
  assert.equal(result.from, "idle");
  assert.equal(result.to, "done");
});

test("EventStore: out-of-order arrival respects timestamp ordering", () => {
  const store = new EventStore();
  store.insert(ev({ type: "Stop", timestamp: "2026-05-28T10:00:01.000Z" }));
  // Later arrival but EARLIER timestamp — must not flip status back to active.
  const result = store.insert(ev({ type: "PreToolUse", timestamp: "2026-05-28T10:00:00.000Z" }));
  assert.equal(store.getStatus(), "done");
  assert.equal(result.to, "done");
});

test("EventStore: duplicate id is dropped (idempotency)", () => {
  const store = new EventStore();
  const e = ev({ type: "Stop", timestamp: "2026-05-28T10:00:00.000Z", id: "dup-1" });
  store.insert(e);
  const result = store.insert(e);
  assert.equal(result.duplicate, true);
  assert.equal(result.from, "done");
  assert.equal(result.to, "done");
});

test("EventStore: status frame only fires when from !== to", () => {
  const store = new EventStore();
  // First Stop: idle → done (transition).
  let res = store.insert(ev({ type: "Stop", timestamp: "2026-05-28T10:00:00.000Z" }));
  assert.notEqual(res.from, res.to);
  // Second Stop later: done → done (no transition; consumer wouldn't broadcast).
  res = store.insert(ev({ type: "Stop", timestamp: "2026-05-28T10:00:01.000Z" }));
  assert.equal(res.from, "done");
  assert.equal(res.to, "done");
});

test("Notification idle wording does not match permission heuristic", () => {
  const store = new EventStore();
  store.insert(
    ev({
      type: "Notification",
      timestamp: "2026-05-28T10:00:00.000Z",
      payload: { message: "Waiting for your input." },
    }),
  );
  assert.equal(store.getStatus(), "idle");
});
