import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Realtime transport seam (interface from N81; native SSE implementation N83 —
 * replaced socket.io). The dashboard pushes server→client frames (activity /
 * status / file-change / snapshot); the browser subscribes with
 * `new EventSource('/sse')`. There is no client→server channel — those actions
 * already use plain HTTP POST routes — so Server-Sent Events is a perfect,
 * zero-dependency fit.
 */
export interface TransportClient {
  /** Push an event to this one connected client (e.g. the initial snapshot). */
  emit(event: string, payload: unknown): void;
}

export interface Transport {
  /**
   * If the request targets the transport's stream path, take over the response
   * (open the SSE stream) and return true; otherwise return false so the caller
   * continues its normal routing.
   */
  handleRequest(req: IncomingMessage, res: ServerResponse): boolean;
  /** Broadcast an event to every connected client. */
  emit(event: string, payload: unknown): void;
  /** Register a handler invoked once per new client connection. */
  onConnection(handler: (client: TransportClient) => void): void;
  /** Close every open client stream. */
  close(): void;
}

export interface SseTransportOptions {
  /** Stream path the EventSource connects to. Default `/sse`. */
  path?: string;
  /** Heartbeat comment interval (ms) to keep proxies from closing idle streams. */
  heartbeatMs?: number;
}

function writeFrame(res: ServerResponse, event: string, payload: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

/** The only Transport implementation: native Server-Sent Events (N83). */
export class SseTransport implements Transport {
  private readonly clients = new Set<ServerResponse>();
  private onConn: ((client: TransportClient) => void) | null = null;
  private readonly path: string;
  private readonly heartbeatMs: number;

  constructor(options: SseTransportOptions = {}) {
    this.path = options.path ?? "/sse";
    this.heartbeatMs = options.heartbeatMs ?? 25000;
  }

  handleRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method !== "GET" || url.pathname !== this.path) return false;

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 1000\n\n");
    this.clients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        /* stream gone — close handler will clean up */
      }
    }, this.heartbeatMs);

    const cleanup = (): void => {
      clearInterval(heartbeat);
      this.clients.delete(res);
    };
    req.on("close", cleanup);
    res.on("error", cleanup);

    // Initial per-connection state (the snapshot) is sent through onConnection,
    // re-fired on every (re)connect so a client recovers after a drop.
    if (this.onConn) {
      this.onConn({ emit: (event, payload) => writeFrame(res, event, payload) });
    }
    return true;
  }

  emit(event: string, payload: unknown): void {
    for (const res of this.clients) {
      try {
        writeFrame(res, event, payload);
      } catch {
        /* stream gone — close handler will clean up */
      }
    }
  }

  onConnection(handler: (client: TransportClient) => void): void {
    this.onConn = handler;
  }

  close(): void {
    for (const res of this.clients) {
      try {
        res.end();
      } catch {
        /* ignore */
      }
    }
    this.clients.clear();
  }
}
