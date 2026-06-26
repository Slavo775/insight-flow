// N188 — `insight-flow mcp`: run the composer MCP server over stdio. The server
// speaks the Model Context Protocol on stdin/stdout, so this command must not
// write anything else to stdout (it would corrupt the protocol stream). It runs
// until the client closes the transport.
import { runComposerMcp } from "../../mcp/index.js";

export async function cmdMcp(): Promise<void> {
  await runComposerMcp();
}
