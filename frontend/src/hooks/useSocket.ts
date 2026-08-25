import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";
import { connectSocket, getSocket, disconnectSocket } from "../features/chat/socket";
import type { Socket } from "socket.io-client";

/**
 * useSocket
 *
 * Custom hook to consume the global Socket.io client connection.
 * Automatically connects when authenticated and exposes the socket instance
 * along with connection state.
 */
export function useSocket() {
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [socket, setSocket] = useState<Socket | null>(getSocket());
  const [isConnected, setIsConnected] = useState(getSocket()?.connected || false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const s = connectSocket(token);
    setSocket(s);
    setIsConnected(s.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [token, isAuthenticated]);

  return { socket, isConnected };
}
