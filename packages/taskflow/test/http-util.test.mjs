import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { sendJson, readBody, escHtml, MIME } from "../dist/index.js";

function mockRes() {
  return {
    status: null,
    headers: null,
    body: "",
    ended: false,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(chunk) {
      if (chunk) this.body += chunk;
      this.ended = true;
    },
  };
}

test("sendJson writes status + JSON content-type + stringified body", () => {
  const res = mockRes();
  sendJson(res, 404, { ok: false });
  assert.equal(res.status, 404);
  assert.equal(res.headers["Content-Type"], MIME[".json"]);
  assert.deepEqual(JSON.parse(res.body), { ok: false });
});

test("escHtml escapes the significant chars, & first", () => {
  assert.equal(escHtml(`<a href="x">&`), "&lt;a href=&quot;x&quot;&gt;&amp;");
});

test("readBody resolves the body under the cap", async () => {
  const req = new EventEmitter();
  req.destroy = () => {};
  const res = mockRes();
  const p = readBody(req, res, 1024);
  req.emit("data", Buffer.from("hello"));
  req.emit("end");
  assert.equal(await p, "hello");
  assert.equal(res.ended, false); // no error response sent
});

test("readBody 413s and resolves null when the body exceeds the cap", async () => {
  const req = new EventEmitter();
  let destroyed = false;
  req.destroy = () => {
    destroyed = true;
  };
  const res = mockRes();
  const p = readBody(req, res, 8);
  req.emit("data", Buffer.from("0123456789"));
  assert.equal(await p, null);
  assert.equal(res.status, 413);
  assert.equal(destroyed, true);
});

test("escHtml escapes the single quote too (N284 A78)", () => {
  assert.equal(escHtml("it's a <'test'>"), "it&#39;s a &lt;&#39;test&#39;&gt;");
});

test("readBody decodes a multibyte char split across chunks (N284 A62)", async () => {
  const req = new EventEmitter();
  req.destroy = () => {};
  const res = mockRes();
  const p = readBody(req, res, 1024);
  // "Ľ" is 2 UTF-8 bytes (0xC4 0xBD); split it across two data chunks.
  const full = Buffer.from("Ľubomír", "utf-8");
  req.emit("data", full.subarray(0, 1));
  req.emit("data", full.subarray(1));
  req.emit("end");
  assert.equal(await p, "Ľubomír", "the split multibyte char is decoded, not corrupted");
});

test("readBody caps by BYTES, not UTF-16 units (N284 A62)", async () => {
  const req = new EventEmitter();
  let destroyed = false;
  req.destroy = () => {
    destroyed = true;
  };
  const res = mockRes();
  // #2 — discriminating: "Ľubomír" is 7 CHARS but 9 BYTES, and the cap is 8. The
  // old char-based cap (7 ≤ 8) would NOT 413; the byte cap (9 > 8) must.
  const p = readBody(req, res, 8); // 8-byte cap
  req.emit("data", Buffer.from("Ľubomír", "utf-8")); // 7 chars / 9 bytes > 8
  const result = await p;
  assert.equal(result, null, "over-cap body resolves null");
  assert.equal(res.status, 413, "over-cap sends 413");
  assert.ok(destroyed, "over-cap destroys the request");
});
