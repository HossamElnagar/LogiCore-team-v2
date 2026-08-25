/**
 * socket.ts  — LogiCore frontend Socket.io client singleton
 *
 * Connects once per session and authenticates via the JWT stored in localStorage.
 * Import `getSocket()` anywhere in the frontend to access the live socket.
 */
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:5000";

let socket: Socket | null = null;

/**
 * connectSocket
 * Creates the Socket.io connection using the supplied JWT token.
 * Should be called once after successful login.
 */
export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("[Socket] Connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.info("[Socket] Disconnected:", reason);
  });

  return socket;
}

/**
 * getSocket
 * Returns the active socket instance, or null if not yet connected.
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * disconnectSocket
 * Cleanly tears down the Socket.io connection (e.g., on logout).
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
