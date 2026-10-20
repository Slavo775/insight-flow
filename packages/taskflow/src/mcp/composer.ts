// N188 — the "composer" MCP server: exposes insight-flow's composer registry
// (modules / agents / flows, built-in AND custom) as MCP tools so an MCP client
// (e.g. Claude Code) can list, author, edit, install, uninstall, and delete
// definitions programmatically — the same operations the dashboard offers.
//
// This is a THIN FACADE: every tool delegates to the exact functions the
// dashboard's HTTP handlers use (custom-defs `writeDefinition`/`removeDefinition`,
// flow-install `executeInstall`/`executeUninstall`, the merged user-space
// registries). No domain logic — validation, the locked/eject tiers, revision
// concurrency, reference-safe uninstall, and the N172 `.mcp.json` undo — is
// reimplemented here; it all lives in the shared core.
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { resolveProjectRoot, resolvePackageAsset } from "../core/paths.js";
import { DEFAULT_BODY_LIMIT } from "../core/http-util.js";
import {
  mergedModuleRegistry,
  mergedComposedAgents,
  mergedProjects,
  mergedChains,
  isModuleEditLocked,
} from "../agents/user-registry.js";
import { isBuiltinProjectId } from "../agents/project.js";
import { describeComposer } from "../agents/composer-conventions.js";
import { installedBuckets, InstallConflictError } from "../agents/emit.js";
import {
  executeInstall,
  executeUninstall,
  installPlan,
  requiredInputs,
  targetBucketId,
  NotInstallableError,
  UnknownTargetError,
  type InstallTarget,
} from "../agents/flow-install.js";
import { readSecrets } from "../core/secrets.js";
import {
  writeDefinition,
  removeDefinition,
  definitionRevision,
  kindFromTarget,
  loadRegistriesForWrite,
  type DefResult,
} from "../dashboard/server/custom-defs.js";

// N267 — `chain` (flow of flows) is a definition kind but has no install step:
// the CLI resolves chains at run time, so install/uninstall keep the 3 kinds.
type Kind = "module" | "agent" | "flow" | "chain";
const kindSchema = z.enum(["module", "agent", "flow", "chain"]);
const installKindSchema = z.enum(["module", "agent", "flow"]);

// --- MCP result helpers -------------------------------------------------------

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string, extra?: Record<string, unknown>): ToolResult {
  return {
    content: [
      { type: "text", text: JSON.stringify({ ok: false, error: message, ...extra }, null, 2) },
    ],
    isError: true,
  };
}

/** Map a custom-defs DefResult to an MCP tool result (>=400 → isError). */
function fromDefResult(r: DefResult): ToolResult {
  return r.status < 300
    ? ok(r.body)
    : { content: [{ type: "text", text: JSON.stringify(r.body, null, 2) }], isError: true };
}

/**
 * Wrap a handler so a missing project, an unknown/non-installable target, an
 * install conflict, or any thrown error becomes a structured tool error instead
 * of crashing the stdio server.
 */
function guard(fn: () => ToolResult): ToolResult {
  try {
    return fn();
  } catch (err) {
    if (err instanceof InstallConflictError) {
      return fail(err.message, { conflict: err.conflict });
    }
    if (err instanceof UnknownTargetError) return fail(err.message, { code: "unknown-target" });
    if (err instanceof NotInstallableError) return fail(err.message, { code: "not-installable" });
    // resolveProjectRoot throws when not inside an insight-flow project.
    return fail((err as Error).message);
  }
}

// --- read helpers -------------------------------------------------------------

function listDefinitions(kind: Kind): ToolResult {
  if (kind === "chain") {
    const items = Object.values(mergedChains()).map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      source: "custom",
      flows: d.flows,
      linkCount: d.links.length,
    }));
    return ok({ kind, count: items.length, items });
  }
  const root = resolveProjectRoot();
  const installed = installedBuckets(root);
  const isInstalled = (id: string): boolean => installed.has(targetBucketId({ kind, id }));

  if (kind === "module") {
    const items = Object.values(mergedModuleRegistry()).map((d) => ({
      id: d.id,
      title: d.title,
      kind: d.kind,
      source: d.source ?? "builtin",
      locked: isModuleEditLocked(d),
      installed: isInstalled(d.id),
    }));
    return ok({ kind, count: items.length, items });
  }
  if (kind === "agent") {
    const items = Object.values(mergedComposedAgents()).map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      source: d.id.startsWith("custom:") ? "custom" : "builtin",
      moduleCount: d.modules.length,
      installed: isInstalled(d.id),
    }));
    return ok({ kind, count: items.length, items });
  }
  const items = Object.values(mergedProjects()).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    source: isBuiltinProjectId(d.id) ? "builtin" : "custom",
    agentCount: d.agents.length,
    entryAgents: d.entryAgents,
    installed: isInstalled(d.id),
  }));
  return ok({ kind, count: items.length, items });
}

function getDefinition(kind: Kind, id: string): ToolResult {
  const storageKind = kindFromTarget(kind);
  if (kind === "chain") {
    const chain = mergedChains()[id];
    if (!chain) return fail(`unknown chain '${id}'`);
    return ok({
      kind,
      id,
      source: "custom",
      revision: definitionRevision(storageKind, id) ?? undefined,
      definition: chain,
    });
  }
  const registry =
    kind === "module"
      ? mergedModuleRegistry()
      : kind === "agent"
        ? mergedComposedAgents()
        : mergedProjects();
  // hasOwn: a plain-object registry would resolve `constructor` & co.
  if (!Object.hasOwn(registry, id)) return fail(`unknown ${kind} '${id}'`);
  const def = (registry as Record<string, unknown>)[id];
  const root = resolveProjectRoot();
  return ok({
    kind,
    id,
    source:
      kind === "module"
        ? ((def as { source?: string }).source ?? "builtin")
        : kind === "agent"
          ? id.startsWith("custom:")
            ? "custom"
            : "builtin"
          : isBuiltinProjectId(id)
            ? "builtin"
            : "custom",
    locked: kind === "module" ? isModuleEditLocked(def as { id: string; kind?: string }) : false,
    installed: installedBuckets(root).has(targetBucketId({ kind, id })),
    // N111 — the optimistic-concurrency token to echo back on update().
    revision: definitionRevision(storageKind, id) ?? undefined,
    definition: def,
  });
}

// --- create / update ----------------------------------------------------------

/** Same cap as the HTTP body (256 KB) so both transports accept the same defs. */
function tooLarge(def: unknown): ToolResult | null {
  return JSON.stringify(def).length > DEFAULT_BODY_LIMIT
    ? fail(`definition too large (max ${DEFAULT_BODY_LIMIT / 1024} KB)`)
    : null;
}

function createDefinition(kind: Kind, def: unknown): ToolResult {
  const big = tooLarge(def);
  if (big) return big;
  const storageKind = kindFromTarget(kind);
  const user = loadRegistriesForWrite(storageKind, "POST");
  return fromDefResult(writeDefinition(storageKind, def, user, { method: "POST" }));
}

function updateDefinition(kind: Kind, def: unknown, revision?: string): ToolResult {
  // N188/N194 — built-in flows are refused over MCP: ejecting/overriding one is a
  // deliberate dashboard action, never an autonomous tool call. Editing any other
  // built-in (module/agent) produces an eject override; locked modules are refused
  // inside writeDefinition. (HTTP keeps full eject parity, built-in flows included.)
  const flowId = (def as { id?: string })?.id;
  if (kind === "flow" && flowId && isBuiltinProjectId(flowId)) {
    return fail(
      `'${flowId}' is a built-in flow — refused over MCP; edit it in the dashboard if you really must`,
    );
  }
  const big = tooLarge(def);
  if (big) return big;
  const storageKind = kindFromTarget(kind);
  const user = loadRegistriesForWrite(storageKind, "PUT");
  return fromDefResult(
    writeDefinition(storageKind, def, user, {
      method: "PUT",
      revision: revision ?? null,
    }),
  );
}

// --- tool registration --------------------------------------------------------

const DEF_SHAPE_HELP = {
  module:
    "A module object: { id, title, kind, ... } where kind is one of section|include|mcp-server|hook|skill|bundle|status-transition|handover|subagent. A 'subagent' carries { name, content, description?, tools?, model?, readonly?, background? } and installs to .claude/agents/<name>.md (read by Claude and Cursor). id must start with 'custom:' (to create) or match a shipped built-in id (to eject/override).",
  agent:
    "An agent object: { id, title, description?, modules: string[], command?, subagents? }. `subagents` is a list of subagent-module ids the agent fans out to (orchestrator pattern). id must start with 'custom:' or match a shipped agent id.",
  flow: "A flow object: { id, title, agents: string[], flow: edges[], install?, statuses?, entryAgents? }. id must start with 'custom:'.",
  chain:
    "A chain object (flow of flows): { id, title, description?, flows: string[], links: { from, on, to, mode?: 'auto'|'gated', when? }[] }. A link leaves a TERMINAL status `on` of flow `from` and enters flow `to` (which needs an entry agent); mode defaults to 'gated'; `when` is one line (max 200 chars, no control characters); title max 200, description max 2000. Flows are not modified, so one flow can sit in many chains. No install step. id must start with 'custom:'.",
} as const;

/** Build the composer MCP server with all ~12 tools registered. */
export function createComposerServer(): McpServer {
  const version = (
    JSON.parse(readFileSync(resolvePackageAsset("package.json"), "utf-8")) as { version: string }
  ).version;
  const server = new McpServer({ name: "insight-flow-composer", version });

  server.registerTool(
    "list",
    {
      description:
        "List composer definitions of a kind (modules, agents, flows, or chains), built-in AND custom, each tagged with source ('builtin'|'custom'), locked (modules only), and installed state.",
      inputSchema: { kind: kindSchema },
    },
    async ({ kind }) => guard(() => listDefinitions(kind)),
  );

  server.registerTool(
    "get",
    {
      description:
        "Get one composer definition by kind and id (built-in or custom), including its full definition, source/locked/installed flags, and the revision token to echo back on update.",
      inputSchema: { kind: kindSchema, id: z.string().min(1) },
    },
    async ({ kind, id }) => guard(() => getDefinition(kind, id)),
  );

  // N196 — authoritative "how to author" reference: the cross-cutting rules plus
  // the exact create_* shape per kind. Call before authoring (and `get` a live def
  // as a template). Omit `kind` for all kinds.
  server.registerTool(
    "describe",
    {
      description:
        "Describe how to author composer entities: the cross-cutting rules (custom: ids, locked tier, agent baseline, handover/single-token model) and the exact create_* shape + fields for a kind. Pass kind=module|agent|flow|chain, or omit for all. Read this before create_*/update_*.",
      inputSchema: { kind: kindSchema.optional() },
    },
    async ({ kind }) =>
      guard(() => ok({ kind: kind ?? "all", conventions: describeComposer(kind) })),
  );

  // create — per-kind for precise, kind-specific def schemas.
  for (const kind of ["module", "agent", "flow", "chain"] as const) {
    server.registerTool(
      `create_${kind}`,
      {
        description: `Create a NEW custom ${kind}; its id MUST start with 'custom:'. To edit or eject a built-in, use update_${kind} instead (create rejects a built-in id). ${DEF_SHAPE_HELP[kind]} Fails (400) on a schema/reference error, (409) if the id already exists.`,
        inputSchema: { def: z.record(z.string(), z.unknown()) },
      },
      async ({ def }) => guard(() => createDefinition(kind, def)),
    );
    server.registerTool(
      `update_${kind}`,
      {
        description:
          kind === "chain"
            ? `Update an existing custom chain in place (chains have no built-ins). ${DEF_SHAPE_HELP.chain} Fails (404) for an unknown id, (400) on a schema/reference error. Pass revision (from get) for optimistic-concurrency safety.`
            : `Update an existing ${kind} (custom def in place, or eject/override a built-in). ${DEF_SHAPE_HELP[kind]} Locked modules${kind === "flow" ? " and built-in flows" : ""} are refused. Pass revision (from get) for optimistic-concurrency safety.`,
        inputSchema: { def: z.record(z.string(), z.unknown()), revision: z.string().optional() },
      },
      async ({ def, revision }) => guard(() => updateDefinition(kind, def, revision)),
    );
  }

  server.registerTool(
    "delete",
    {
      description:
        "Delete a custom definition (or revert a built-in override). Reference-safe: refuses (409) while still referenced by another definition; locked modules are refused. Distinct from uninstall — this removes the definition itself, not its emitted artifacts.",
      inputSchema: { kind: kindSchema, id: z.string().min(1) },
    },
    async ({ kind, id }) =>
      guard(() => {
        // N273 (A53b) — a still-installed definition's emitted artifacts (hooks,
        // .mcp.json entries, commands) would be orphaned if the definition itself
        // is deleted, since the id then vanishes from list/get. Refuse and point
        // at uninstall. Chains have no install step, so they're exempt.
        if (
          kind !== "chain" &&
          installedBuckets(resolveProjectRoot()).has(targetBucketId({ kind, id }))
        ) {
          return fail(`'${id}' is installed — uninstall it first, then delete`, {
            code: "installed",
          });
        }
        const storageKind = kindFromTarget(kind);
        return fromDefResult(
          removeDefinition(storageKind, id, loadRegistriesForWrite(storageKind, "DELETE")),
        );
      }),
  );

  server.registerTool(
    "install",
    {
      description:
        "Install a flow/agent/module: emit its artifacts under the target's manifest bucket. " +
        "SECURITY: a target that emits a HOOK or an MCP SERVER writes a shell command / server " +
        "into .claude/settings.json / .mcp.json that RUNS in the user's future Claude sessions. " +
        "For such targets this tool first returns { needsConfirm:true, plan } and writes NOTHING; " +
        "re-call with confirm:true (after a human has seen the plan) to apply. Provide any required " +
        "${VAR} inputs via `values` (or they must already be stored); missing ones are reported. " +
        "force:true overwrites a conflicting .mcp.json entry (snapshotted for uninstall-undo).",
      inputSchema: {
        kind: installKindSchema,
        id: z.string().min(1),
        force: z.boolean().optional(),
        confirm: z.boolean().optional(),
        values: z.record(z.string(), z.string()).optional(),
      },
    },
    async ({ kind, id, force, confirm, values }) =>
      guard(() => {
        const target: InstallTarget = { kind, id };
        const root = resolveProjectRoot();
        const plan = installPlan(target); // throws Unknown/NotInstallable
        const writesExecutable = plan.some((s) => s.kind === "hook" || s.kind === "mcp");

        // N273 (A53a) — refuse rather than writing a literal `${VAR}` that would
        // leave the installed MCP server silently broken.
        const stored = readSecrets(root);
        const provided = values ?? {};
        const missing = requiredInputs(target)
          .map((i) => i.name)
          .filter((name) => provided[name] === undefined && stored[name] === undefined);
        if (missing.length) {
          return fail(`missing required inputs: ${missing.join(", ")}`, { missingInputs: missing });
        }

        // N273 (A14) — human-confirm gate for executable artifacts. The dashboard
        // path shows these in the InstallModal; over MCP there is no UI, so a
        // prompt-injected agent must not be able to persist a hook silently.
        if (writesExecutable && confirm !== true) {
          return ok({ needsConfirm: true, kind, id, plan });
        }

        const reports = executeInstall(target, root, { force, values: provided });
        return ok({ ok: true, kind, id, reports });
      }),
  );

  server.registerTool(
    "uninstall",
    {
      description:
        "Uninstall a flow/agent/module: remove its emitted artifacts, reference-safe (artifacts still owned by another target are retained; an overwritten .mcp.json entry is restored to its snapshot). The definition itself is kept — use delete to remove it.",
      inputSchema: { kind: installKindSchema, id: z.string().min(1) },
    },
    async ({ kind, id }) =>
      guard(() => {
        const target: InstallTarget = { kind, id };
        const root = resolveProjectRoot();
        // N273 (A53c) — don't claim success for a target that was never installed.
        if (!installedBuckets(root).has(targetBucketId(target))) {
          return ok({ ok: true, kind, id, installed: false, reports: [] });
        }
        const reports = executeUninstall(target, root);
        return ok({ ok: true, kind, id, installed: true, reports });
      }),
  );

  return server;
}
