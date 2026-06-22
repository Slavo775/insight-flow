// N165 — templated install inputs. Module configs (notably mcp-server `config`)
// may embed `${VAR}` placeholders. At install time every placeholder becomes a
// collected input; its value is substituted into the resolved config written to
// `.mcp.json`. Claude Code's own `${VAR}` expansion can't be relied on (it is
// broken for `.mcp.json` headers — anthropics/claude-code#51581), so insight-flow
// resolves placeholders itself.

/** A required input derived from a `${VAR}` placeholder (+ optional metadata). */
export interface InputSpec {
  /** The placeholder name, e.g. `CONTEXT7_API_KEY`. */
  name: string;
  /** Display title; defaults to `name`. */
  title: string;
  /** Optional help text. */
  description?: string;
  /** Render masked + keep out of logs/SSE. Defaults to true (inputs are secrets-by-default). */
  secret: boolean;
}

/** Optional author-supplied metadata for an input (module `inputs[]` entry). */
export interface InputMeta {
  name: string;
  title?: string;
  description?: string;
  secret?: boolean;
}

const PLACEHOLDER = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** Deep-collect the unique `${VAR}` names referenced anywhere in `value`. */
export function scanPlaceholders(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof value === "string") {
    for (const m of value.matchAll(PLACEHOLDER)) out.add(m[1]);
  } else if (Array.isArray(value)) {
    for (const v of value) scanPlaceholders(v, out);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) scanPlaceholders(v, out);
  }
  return out;
}

/**
 * Deep-substitute `${VAR}` with `values[VAR]`. Unprovided placeholders are left
 * literal (so a value that legitimately relies on Claude Code's own env
 * expansion still passes through unchanged).
 */
export function substituteVars<T>(value: T, values: Record<string, string>): T {
  if (typeof value === "string") {
    return value.replace(PLACEHOLDER, (whole, name: string) =>
      Object.prototype.hasOwnProperty.call(values, name) ? values[name] : whole,
    ) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => substituteVars(v, values)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substituteVars(v, values);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Merge scanned placeholders with author-supplied `inputs[]` metadata into the
 * ordered, de-duplicated list of inputs an install must collect. Placeholders
 * with no metadata default to `{ title: name, secret: true }`.
 */
export function resolveInputs(scanned: Iterable<string>, meta: InputMeta[] = []): InputSpec[] {
  const byName = new Map<string, InputMeta>();
  for (const m of meta) byName.set(m.name, m);
  const out: InputSpec[] = [];
  const seen = new Set<string>();
  for (const name of scanned) {
    if (seen.has(name)) continue;
    seen.add(name);
    const m = byName.get(name);
    out.push({
      name,
      title: m?.title ?? name,
      ...(m?.description ? { description: m.description } : {}),
      secret: m?.secret ?? true,
    });
  }
  return out;
}
