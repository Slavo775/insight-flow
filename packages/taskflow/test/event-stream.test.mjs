/**
 * Unit tests for the deterministic status engine (N238, replaces N68 heuristic)
 * + event store.
 * Run: node test/event-stream.test.mjs (after `pnpm build`)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const { deriveStatus, statusFromEvent, EventStore } = await import(
  fileURLToPath(new URL("../dist/index.js", import.meta.url))
);

let seq = 0;
function ev(overrides = {}) {
  return {
    id: overrides.id ?? "id_" + seq++,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    type: overrides.type ?? "PreToolUse",
    payload: overrides.payload ?? {},
  };
}

// --- statusFromEvent (standalone status a single event implies) ---

test("statusFromEvent: Stop → done", () => {
  assert.equal(statusFromEvent(ev({ type: "Stop" })), "done");
});

test("statusFromEvent: PermissionRequest → awaiting-permission", () => {
  assert.equal(statusFromEvent(ev({ type: "PermissionRequest" })), "awaiting-permission");
});

test("statusFromEvent: SubagentStop → idle (ignored, not a terminal) — N238", () => {
  // A subagent finishing must NOT read as done.
  assert.equal(statusFromEvent(ev({ type: "SubagentStop" })), "idle");
});

test("statusFromEvent: Notification with permission wording → awaiting-permission", () => {
  assert.equal(
    statusFromEvent(
      ev({
        type: "Notification",
        payload: { message: "Claude needs your permission to use Bash" },
      }),
    ),
    "awaiting-permission",
  );
});

test("statusFromEvent: Notification without permission wording → idle (pause)", () => {
  assert.equal(
    statusFromEvent(
      ev({ type: "Notification", payload: { message: "Claude is waiting for your input" } }),
    ),
    "idle",
  );
});

test("statusFromEvent: working hook types → active", () => {
  for (const t of ["PreToolUse", "PostToolUse", "UserPromptSubmit"]) {
    assert.equal(statusFromEvent(ev({ type: t })), "active");
  }
});

test("statusFromEvent: SessionStart → idle (session seeded, not working) — N238", () => {
  assert.equal(statusFromEvent(ev({ type: "SessionStart" })), "idle");
});

test("statusFromEvent: dash-case derived names are handled like their CamelCase — N238 review-fix", () => {
  // The activity feed inserts dash-case names (index.ts activityRowToHookEvent);
  // both must route the same as CamelCase, not fall through to `active`.
  assert.equal(statusFromEvent(ev({ type: "session-start" })), "idle");
  assert.equal(statusFromEvent(ev({ type: "notification", payload: {} })), "idle");
});

test("deriveStatus: a dash-case session-start does not override a finished turn — N238 review-fix", () => {
  // A Stop then a later-timestamp session-start must NOT flip done → active.
  const events = [
    ev({ timestamp: "2026-05-28T10:00:00.000Z", type: "PostToolUse" }),
    ev({ timestamp: "2026-05-28T10:00:01.000Z", type: "Stop" }),
    ev({ timestamp: "2026-05-28T10:00:02.000Z", type: "session-start" }),
  ];
  // session-start seeds turn=idle → effective idle (not active). The point is it
  // is NOT treated as `work` → active.
  assert.equal(deriveStatus(events), "idle");
});

test("statusFromEvent: legacy derived names map correctly", () => {
  assert.equal(statusFromEvent(ev({ type: "agent-idle" })), "done");
  assert.equal(statusFromEvent(ev({ type: "approval-required" })), "awaiting-permission");
  assert.equal(statusFromEvent(ev({ type: "tool-requested" })), "active");
});

// --- deriveStatus (fold over the whole window) ---

test("deriveStatus: empty window → idle", () => {
  assert.equal(deriveStatus([]), "idle");
});

test("deriveStatus: a real Stop after work → done", () => {
  const events = [
    ev({ timestamp: "2026-05-28T10:00:00.000Z", type: "PreToolUse" }),
    ev({ timestamp: "2026-05-28T10:00:01.000Z", type: "Stop" }),
  ];
  assert.equal(deriveStatus(events), "done");
});

test("deriveStatus: SubagentStop mid-work stays active (does NOT flip to done) — N238", () => {
  const events = [
    ev({ timestamp: "2026-05-28T10:00:00.000Z", type: "PreToolUse" }),
    ev({ timestamp: "2026-05-28T10:00:01.000Z", type: "SubagentStop" }),
  ];
  assert.equal(deriveStatus(events), "active");
});

test("deriveStatus: permission is sticky until a resolving event — N238", () => {
  // work → permission → (nothing) stays awaiting-permission.
  const pending = [
    ev({ timestamp: "2026-05-28T10:00:00.000Z", type: "PreToolUse" }),
    ev({
      timestamp: "2026-05-28T10:00:01.000Z",
      type: "Notification",
      payload: { message: "Claude needs your permission to use Bash" },
    }),
  ];
  assert.equal(deriveStatus(pending), "awaiting-permission");
  // A following PostToolUse (approval resolved) clears it → active.
  const resolved = [...pending, ev({ timestamp: "2026-05-28T10:00:02.000Z", type: "PostToolUse" })];
  assert.equal(deriveStatus(resolved), "active");
});

test("deriveStatus: an idle Notification does not clear a pending permission — N238", () => {
  const events = [
    ev({
      timestamp: "2026-05-28T10:00:00.000Z",
      type: "Notification",
      payload: { message: "needs your permission" },
    }),
    ev({
      timestamp: "2026-05-28T10:00:01.000Z",
      type: "Notification",
      payload: { message: "Claude is waiting for your input" },
    }),
  ];
  assert.equal(deriveStatus(events), "awaiting-permission");
});

test("deriveStatus: stuck-active decay → idle when nowMs is stale — N238", () => {
  const events = [ev({ timestamp: "2026-05-28T10:00:00.000Z", type: "PreToolUse" })];
  const t0 = Date.parse("2026-05-28T10:00:00.000Z");
  // Fresh: still active.
  assert.equal(deriveStatus(events, t0 + 1000), "active");
  // 6 minutes later with no new event: decays to idle.
  assert.equal(deriveStatus(events, t0 + 6 * 60_000), "idle");
});

// --- EventStore ---

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
