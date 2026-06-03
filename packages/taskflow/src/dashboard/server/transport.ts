import { Server as IOServer, type Socket as IOSocket } from "socket.io";
import type { Server as HttpServer } from "node:http";

/**
 * Realtime transport seam (N81, 1c).
 *
 * The dashboard pushes live frames (activity / status / file-change / snapshot)
 * to the browser. Today that runs over Socket.IO; this interface is the seam
 * where a lighter native WebSocket/SSE transport can be dropped in later — the
 * planned socket.io removal — without touching the server's call sites.
 */
export interface TransportClient {
  /** Push an event to this one connected client (e.g. initial snapshot). */
  emit(event: string, payload: unknown): void;
}

export interface Transport {
  /** Broadcast an event to every connected client. */
  emit(event: string, payload: unknown): void;
  /** Register a handler invoked once per new client connection. */
  onConnection(handler: (client: TransportClient) => void): void;
  /** Tear down the transport (closes sockets + the underlying server hook). */
  close(): void;
}

export interface SocketIoTransportOptions {
  cors?: { origin: string; methods: string[] };
  pingInterval?: number;
  pingTimeout?: number;
}

/** The only Transport implementation today: Socket.IO over the HTTP server. */
export class SocketIoTransport implements Transport {
  private readonly io: IOServer;

  constructor(server: HttpServer, options: SocketIoTransportOptions = {}) {
    this.io = new IOServer(server, {
      cors: options.cors ?? { origin: "*", methods: ["GET"] },
      pingInterval: options.pingInterval ?? 25000,
      pingTimeout: options.pingTimeout ?? 20000,
    });
  }

  emit(event: string, payload: unknown): void {
    this.io.emit(event, payload);
  }

  onConnection(handler: (client: TransportClient) => void): void {
    this.io.on("connection", (sock: IOSocket) => {
      handler({ emit: (event, payload) => sock.emit(event, payload) });
    });
  }

  close(): void {
    this.io.close();
  }
}
