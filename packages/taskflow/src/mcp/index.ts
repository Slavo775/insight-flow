// N188 — composer MCP server entry. Connects the server (composer.ts) to a
// stdio transport so it runs as a subprocess of an MCP client (Claude Code et
// al.) registered in `.mcp.json` as { "command": "insight-flow", "args": ["mcp"] }.
// stdio only — no port, no network surface.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createComposerServer } from "./composer.js";

export { createComposerServer };

/** Start the composer MCP server over stdio. Resolves when the transport closes. */
export async function runComposerMcp(): Promise<void> {
  const server = createComposerServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
