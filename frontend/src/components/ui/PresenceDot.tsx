/**
 * PresenceDot.tsx
 *
 * Animated online/offline presence indicator driven by Socket.io events.
 *
 * Props:
 *   userId  — the user whose presence to track
 *   size    — dot diameter class: "sm" | "md" | "lg" (default "md")
 *   label   — optionally show "Online / Offline" text label
 *
 * The component subscribes to:
 *   • presence:online  — { userId }
 *   • presence:offline — { userId }
 *
 * When online it renders a pulsing emerald ring; offline renders a static slate dot.
 */
import { useEffect, useState } from "react";
import { getSocket } from "../../features/chat/socket";

interface PresenceDotProps {
  userId: string;
  initialOnline?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeMap = {
  sm: { dot: "h-2 w-2", ping: "h-2 w-2", text: "text-xs" },
  md: { dot: "h-3 w-3", ping: "h-3 w-3", text: "text-sm" },
  lg: { dot: "h-4 w-4", ping: "h-4 w-4", text: "text-base" },
};

export default function PresenceDot({
  userId,
  initialOnline = false,
  size = "md",
  showLabel = false,
}: PresenceDotProps) {
  const [isOnline, setIsOnline] = useState(initialOnline);
  const { dot, ping, text } = sizeMap[size];

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOnline = (data: { userId: string }) => {
      if (data.userId === userId) setIsOnline(true);
    };

    const handleOffline = (data: { userId: string }) => {
      if (data.userId === userId) setIsOnline(false);
    };

    socket.on("presence:online", handleOnline);
    socket.on("presence:offline", handleOffline);

    return () => {
      socket.off("presence:online", handleOnline);
      socket.off("presence:offline", handleOffline);
    };
  }, [userId]);

  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-label={isOnline ? "Online" : "Offline"}
    >
      <span className="relative inline-flex">
        {/* Pulsing outer ring — only when online */}
        {isOnline && (
          <span
            className={`absolute inline-flex ${ping} animate-ping rounded-full bg-emerald-400 opacity-75`}
          />
        )}
        {/* Core dot */}
        <span
          className={`relative inline-flex rounded-full ${dot} transition-colors duration-500 ${
            isOnline ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
      </span>

      {showLabel && (
        <span
          className={`font-semibold ${text} transition-colors duration-300 ${
            isOnline ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </span>
  );
}
