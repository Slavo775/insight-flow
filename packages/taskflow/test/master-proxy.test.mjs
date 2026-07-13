/**
 * N212 — the master reverse-proxies a registered project's dashboard under
 * /p/<id>/*. Proves: HTML shell is rewritten (asset refs prefixed + base hook
 * injected), assets pass through, SSE streams incrementally, and — the review's
 * security blocker — a non-loopback target is refused (SSRF guard).
 *
 * Hermetic: a stub upstream + a master, both on random loopback ports. Requires
 * a prior build (dist/ present).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { startMasterServer } from "../dist/index.js";

function startStub() {
  const server = createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end('<html><head></head><body><script src="/assets/app.js"></script></body></html>');
    } else if (req.url === "/assets/app.js") {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      res.end("console.log('stub');");
    } else if (req.url === "/sse") {
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write("retry: 1000\n\n");
      res.write("event: ping\ndata: 1\n\n");
      // keep open — the test reads one frame then aborts
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, base: "http://127.0.0.1:" + port });
    });
  });
}

test("master proxies a project dashboard under /project/<projectId>/* (HTML/asset/SSE + SSRF guard)", async () => {
  const { server: stub, base: stubBase } = await startStub();
  const port = 6700 + Math.floor(Math.random() * 200);
  const master = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });

  try {
    // Register the stub (loopback) + a non-loopback project.
    await fetch(master + "/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "proxy-ok", label: "ok", url: stubBase }),
    });
    await fetch(master + "/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "proxy-evil", label: "evil", url: "http://example.com" }),
    });

    // HTML shell: asset refs rewritten under the canonical /project/ prefix + base hook injected.
    const htmlRes = await fetch(master + "/project/proxy-ok/");
    assert.equal(htmlRes.status, 200, "shell should proxy 200");
    const html = await htmlRes.text();
    assert.match(html, /<base href="\/project\/proxy-ok\/">/, "base tag injected");
    assert.match(html, /window\.__IF_BASE__="\/project\/proxy-ok\/"/, "base hook injected");
    assert.match(
      html,
      /src="\/project\/proxy-ok\/assets\/app\.js"/,
      "asset ref rewritten under prefix",
    );

    // Asset passes through.
    const assetRes = await fetch(master + "/project/proxy-ok/assets/app.js");
    assert.equal(assetRes.status, 200, "asset should proxy 200");
    assert.match(await assetRes.text(), /console\.log\('stub'\)/, "asset body proxied");

    // SSE streams incrementally.
    const controller = new AbortController();
    const sseRes = await fetch(master + "/project/proxy-ok/sse", { signal: controller.signal });
    assert.match(
      sseRes.headers.get("content-type") || "",
      /text\/event-stream/,
      "SSE content-type preserved",
    );
    const reader = sseRes.body.getReader();
    const { value } = await reader.read();
    const frame = new TextDecoder().decode(value);
    assert.match(frame, /event: ping/, "SSE frame streamed through the proxy");
    controller.abort();
    await reader.cancel().catch(() => {});

    // SSRF guard: a non-loopback target is refused.
    const evilRes = await fetch(master + "/project/proxy-evil/");
    assert.equal(evilRes.status, 403, "non-loopback proxy target must be refused");
  } finally {
    close();
    stub.closeAllConnections?.();
    stub.close();
  }
});
