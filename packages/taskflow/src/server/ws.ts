import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

const WS_MAGIC = "258EAFA5-E914-47DA-95CA-5AB9FE764C93";

export interface WsClient {
  socket: Duplex;
  send: (data: string) => void;
  close: () => void;
  onClose: (cb: () => void) => void;
}

export function handleUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): WsClient | null {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return null;
  }

  const accept = createHash("sha1")
    .update(key + WS_MAGIC)
    .digest("base64");

  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      "Sec-WebSocket-Accept: " +
      accept +
      "\r\n\r\n",
  );

  let closeCallbacks: Array<() => void> = [];
  let alive = true;

  function sendFrame(data: string): void {
    if (!alive) return;
    const payload = Buffer.from(data, "utf-8");
    const len = payload.length;
    let header: Buffer;

    if (len < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + text opcode
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }

    socket.write(Buffer.concat([header, payload]));
  }

  function destroy(): void {
    if (!alive) return;
    alive = false;
    for (const cb of closeCallbacks) cb();
    closeCallbacks = [];
    socket.destroy();
  }

  // Parse incoming frames (we only care about close/ping/pong)
  let buffer = Buffer.alloc(0);

  function processBuffer(): void {
    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const masked = (secondByte & 0x80) !== 0;
      let payloadLen = secondByte & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) return;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) return;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLen = masked ? 4 : 0;
      const totalLen = offset + maskLen + payloadLen;
      if (buffer.length < totalLen) return;

      if (opcode === 0x8) {
        // Close frame
        destroy();
        return;
      }

      if (opcode === 0x9) {
        // Ping — send pong
        const pong = Buffer.alloc(2);
        pong[0] = 0x8a; // FIN + pong
        pong[1] = 0;
        socket.write(pong);
      }

      buffer = buffer.subarray(totalLen);
    }
  }

  socket.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    processBuffer();
  });

  socket.on("close", destroy);
  socket.on("error", destroy);

  // Process any data that came with the upgrade
  if (head.length > 0) {
    buffer = Buffer.concat([buffer, head]);
    processBuffer();
  }

  return {
    socket,
    send: sendFrame,
    close: destroy,
    onClose: (cb) => closeCallbacks.push(cb),
  };
}
