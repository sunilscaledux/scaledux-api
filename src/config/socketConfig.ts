/**
 * Socket server and chat realtime configuration.
 * Used by socket-server.ts (standalone Socket.IO process) and chatSocket.ts (API → socket HTTP notify).
 */
const socketConfig = {
  /** Port the socket server listens on (socket-server process). */
  port: parseInt(process.env.PORT_SOCKET || "4001", 10),

  /** Secret for internal POST /emit (API → socket server). Must match in API and socket server env. */
  emitSecret: process.env.SOCKET_EMIT_SECRET || "change-me-in-production",

  /** Socket server base URL (used by API to send emit requests). */
  serverUrl: process.env.SOCKET_SERVER_URL || "http://localhost:4001",

  /** CORS origin for Socket.IO handshake (same as main API when not set). */
  corsOrigin:
    process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean) || true,
};

export default socketConfig;
