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
