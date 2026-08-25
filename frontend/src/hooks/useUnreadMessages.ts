import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";
import { useSocket } from "./useSocket";
import { UserRole } from "../types/user.types";

/**
 * Returns total unread message count for the chat route of the current user:
 * - CS_AGENT  → /dashboard/cs-chats
 * - DRIVER    → /incidents
 *
 * Increments on new_message when the user is NOT on that route.
 * Resets to 0 when the user navigates to that route.
 */
export function useUnreadMessages() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket } = useSocket();
  const location = useLocation();
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Which pathname should trigger a reset
  const chatRoute =
    user?.role === UserRole.CS_AGENT
      ? "/dashboard/cs-chats"
      : user?.role === UserRole.DRIVER
      ? "/incidents"
      : null;

  // CS_AGENT also resets when on cs-incidents page
  const resetRoutes =
    user?.role === UserRole.CS_AGENT
      ? ["/dashboard/cs-chats", "/dashboard/cs-incidents"]
      : chatRoute
      ? [chatRoute]
      : [];

  // Ref so socket handler always has latest pathname without re-subscribing
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Reset when user navigates to any chat route
  useEffect(() => {
    if (resetRoutes.some((r) => location.pathname.startsWith(r))) {
      setUnreadTotal(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!socket || !chatRoute) return;

    const handleUnreadNotification = (payload: any) => {
      const senderId = String(payload.senderId);
      if (senderId === String(user?.id)) return;
      if (resetRoutes.some((r) => pathnameRef.current.startsWith(r))) return;
      setUnreadTotal((prev) => prev + (payload.unreadCount || 1));
    };

    socket.on("unread_notification", handleUnreadNotification);
    return () => { socket.off("unread_notification", handleUnreadNotification); };
  }, [socket, chatRoute, user?.id]);

  return { unreadTotal, chatRoute };
}
