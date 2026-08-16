import { io } from "socket.io-client";

/**
 * Singleton Socket.IO client instance.
 *
 * A single socket persists across page navigations within the same tab,
 * avoiding duplicate connections when components re-mount. The socket
 * connects lazily (autoConnect: false) and features connection timeout,
 * reconnection attempts, error logging, and transport fallback.
 */

let socket;

export function getSocket() {
  if (!socket) {
    const serverUrl =
      process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

    socket = io(serverUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log(`[Socket] Connected to ${serverUrl} (id: ${socket.id})`);
    });

    socket.on("connect_error", (error) => {
      console.error(`[Socket] Connection error: ${error.message}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`[Socket] Reconnection attempt #${attempt}`);
    });

    socket.on("reconnect_error", (error) => {
      console.error(`[Socket] Reconnection error: ${error.message}`);
    });

    socket.on("reconnect_failed", () => {
      console.error(`[Socket] Reconnection failed after all attempts`);
    });

    socket.on("error", (error) => {
      console.error(`[Socket] Error: ${error.message || error}`);
    });
  }
  return socket;
}

/**
 * Disconnect and clean up the socket instance.
 * Useful when the user explicitly leaves a room or navigates away.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}