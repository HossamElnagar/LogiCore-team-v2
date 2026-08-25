import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCheck,
  User,
  Radio,
  ExternalLink,
  Lock,
} from "lucide-react";
import { incidentService } from "../incident.service";
import { useSocket } from "../../../hooks/useSocket";
import { IncidentStatusBadge } from "./IncidentStatusBadge";
import type { Incident, IncidentChatRoom, ChatMessage } from "../../../types/incident.types";
import type { RootState } from "../../../app/store";

interface Props {
  incident: Incident | null;
  theme?: "light" | "dark";
  canResolve?: boolean;
  canEscalate?: boolean;
  onResolve?: (updated?: Record<string, unknown>) => void;
  onEscalateClick?: () => void;
  headerSubtitle?: string;
}

export const IncidentChatPanel: React.FC<Props> = ({
  incident,
  theme = "light",
  canResolve = false,
  canEscalate = false,
  onResolve,
  onEscalateClick,
  headerSubtitle,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket, isConnected } = useSocket();
  const [room, setRoom] = useState<IncidentChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";
  const isResolved = incident?.status === "RESOLVED" || incident?.status === "CLOSED";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Get or create incident room & load messages
  useEffect(() => {
    if (!incident || !incident._id) {
      setRoom(null);
      setMessages([]);
      return;
    }

    const initChat = async () => {
      setLoading(true);
      setError(null);
      try {
        const chatRoom = await incidentService.getIncidentChatRoom(incident._id);
        setRoom(chatRoom);
        const msgs = await incidentService.getRoomMessages(chatRoom._id);
        // sort chronological ascending for display
        const sorted = [...msgs].sort((a, b) => {
          const t1 = new Date(a.createdAt || a.timestamp || 0).getTime();
          const t2 = new Date(b.createdAt || b.timestamp || 0).getTime();
          return t1 - t2;
        });
        setMessages(sorted);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to initialize secure incident room.");
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 150);
      }
    };

    void initChat();
  }, [incident?._id]);

  // 2. Manage socket room join and live listeners
  useEffect(() => {
    if (!socket || !room?._id) return;

    // Join room and mark it as read when the participant opens it
    socket.emit("join_room", { roomId: room._id });

    const handleNewMessage = (newMsg: ChatMessage) => {
      if (String(newMsg.roomId) === String(room._id)) {
        setMessages((prev) => {
          const incomingMsg = {
            ...newMsg,
            senderId: String(newMsg.senderId || ""),
            roomId: String(newMsg.roomId || room._id),
          };

          if (incomingMsg._id && prev.some((m) => String(m._id) === String(incomingMsg._id))) {
            return prev;
          }

          const optimisticMatch = prev.find((m) => {
            if (!m._id || String(m._id).startsWith("optimistic-")) {
              if (String(m.senderId) !== String(incomingMsg.senderId)) return false;
              if (m.text !== incomingMsg.text) return false;
              const mTime = new Date(m.timestamp || m.createdAt || 0).getTime();
              const nTime = new Date(incomingMsg.timestamp || incomingMsg.createdAt || 0).getTime();
              return Math.abs(mTime - nTime) < 15000;
            }
            return false;
          });

          if (optimisticMatch) {
            return prev.map((m) => (m === optimisticMatch ? { ...m, ...incomingMsg, _id: incomingMsg._id || m._id } : m));
          }

          return [...prev, incomingMsg];
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    const handleRoomRead = (payload: { roomId?: string; unreadCount?: number }) => {
      if (String(payload.roomId) === String(room._id)) {
        setMessages((prev) => prev);
      }
    };

    const handleRoomResolved = (payload: any) => {
      if (String(payload.roomId) === String(room._id)) {
        setMessages((prev) => [
          ...prev,
          {
            roomId: room._id,
            senderId: "system",
            senderName: "System Dispatch Notification",
            senderRole: "SYSTEM",
            text: payload.message || "The incident has been officially resolved and chat room archived.",
            timestamp: payload.timestamp || new Date().toISOString(),
          },
        ]);
        if (onResolve) onResolve(payload);
        setTimeout(scrollToBottom, 100);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("room_read", handleRoomRead);
    socket.on("room_resolved", handleRoomResolved);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("room_read", handleRoomRead);
      socket.off("room_resolved", handleRoomResolved);
    };
  }, [socket, room?._id, onResolve]);

  const handleSendMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if (!textToSend && !attachmentUrl.trim()) return;
    if (!socket || !room?._id || !user) return;

    socket.emit("join_room", { roomId: room._id });

    const optimisticMessage: ChatMessage = {
      _id: `optimistic-${Date.now()}`,
      roomId: room._id,
      senderId: user.id,
      senderName: user.userName || "You",
      senderRole: user.role,
      text: textToSend || "Shared an attachment evidence.",
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    const attachments: string[] = [];
    if (attachmentUrl.trim()) {
      attachments.push(attachmentUrl.trim());
    }

    socket.emit("send_message", {
      roomId: room._id,
      text: textToSend || "Shared an attachment evidence.",
      attachments,
    });

    setInputText("");
    setAttachmentUrl("");
    setShowAttachInput(false);
    setTimeout(scrollToBottom, 100);
  };

  const handleShareGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const text = `📍 [LIVE GPS TELEMETRY BROADCAST]: Current coordinates locked at ${pos.coords.latitude.toFixed(6)}° N, ${pos.coords.longitude.toFixed(6)}° E (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`;
          handleSendMessage(undefined, text);
        },
        () => {
          // Fallback to incident coordinates if geo denied
          const lat = incident?.metadata?.driverLat || 30.0444;
          const lng = incident?.metadata?.driverLng || 31.2357;
          handleSendMessage(undefined, `📍 [INCIDENT LOCATION REPORT]: Coordinates registered at ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      const lat = incident?.metadata?.driverLat || 30.0444;
      const lng = incident?.metadata?.driverLng || 31.2357;
      handleSendMessage(undefined, `📍 [INCIDENT LOCATION REPORT]: Coordinates registered at ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
    }
  };

  const handleResolveIncident = async () => {
    if (!room?._id) return;
    setResolving(true);
    try {
      const res = await incidentService.resolveChatRoom(room._id);
      if (onResolve) onResolve(res);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to mark incident as resolved.");
    } finally {
      setResolving(false);
    }
  };

  if (!incident) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center rounded-3xl border p-8 text-center transition-all ${
          isDark
            ? "border-slate-800 bg-slate-900/50 text-slate-400"
            : "border-dashed border-slate-300 bg-slate-50 text-slate-500"
        }`}
      >
        <Radio className="mb-3 h-10 w-10 opacity-30" />
        <h3 className="text-sm font-bold">No Active Room Selected</h3>
        <p className="mt-1 text-xs opacity-75">Select an incident to connect with Ground Representatives & CS Agents.</p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-3xl border transition-all ${
        isDark
          ? "border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl shadow-black/50"
          : "border-slate-200 bg-white text-slate-800 shadow-sm"
      }`}
    >
      {/* ── HEADER ── */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b p-4.5 px-6 ${
          isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50/70"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
              incident.severity === "CRITICAL"
                ? "bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse"
                : "bg-sky-500/15 text-sky-500 border-sky-500/30"
            }`}
          >
            <Radio className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                {room?.title || incident.title}
              </h2>
              <IncidentStatusBadge status={incident.status} variant={isDark ? "dark" : "default"} />
            </div>
            <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
              {headerSubtitle || `Secure Room #${room?._id?.slice(-6) || incident._id.slice(-6)} • Participants: ${room?.participants?.length || 2} Online`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {canEscalate && !incident.escalatedByManager && !isResolved && (
            <button
              type="button"
              onClick={onEscalateClick}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-rose-600/20 active:scale-95 transition"
            >
              <ShieldAlert className="h-4 w-4 animate-bounce" />
              <span>Escalate to Manager</span>
            </button>
          )}

          {canResolve && !isResolved && (
            <button
              type="button"
              onClick={handleResolveIncident}
              disabled={resolving}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600/15 hover:bg-emerald-600 hover:text-white px-3.5 py-2 text-xs font-black text-emerald-500 active:scale-95 transition disabled:opacity-50"
            >
              {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </div>

      {/* ── MESSAGE STREAM ── */}
      <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${isDark ? "bg-slate-950/40" : "bg-slate-50/40"}`}>
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs font-bold opacity-60">Encrypting & Connecting to Incident Handlers...</p>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-xs font-bold text-rose-500">
            <AlertCircle className="mx-auto mb-2 h-6 w-6" />
            {error}
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg, idx) => {
            const isMe = String(msg.senderId) === String(user?.id);
            const isSystem = msg.senderRole === "SYSTEM" || msg.senderId === "system";
            const isManager = ["OWNER", "CS_MANAGER", "DRIVER_MANAGER"].includes(msg.senderRole);

            if (isSystem) {
              return (
                <div key={idx} className="mx-auto my-3 flex max-w-lg items-center justify-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/80 px-4 py-2 text-[11px] font-bold text-slate-300 shadow-inner text-center">
                  <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            return (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%] ${
                  isMe ? "ml-auto" : "mr-auto"
                }`}
              >
                {/* Sender Tag */}
                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 mb-1 px-1">
                  <span>{msg.senderName || "Participant"}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-black tracking-wider uppercase ${
                      isManager
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : msg.senderRole === "DRIVER"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                    }`}
                  >
                    {msg.senderRole.replace("_", " ")}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative rounded-3xl p-4 shadow-md transition-all ${
                    isMe
                      ? isDark
                        ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-tr-none"
                        : "bg-emerald-600 text-white rounded-tr-none"
                      : isDark
                      ? "bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/80"
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                  }`}
                >
                  <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>

                  {/* Proof Attachment */}
                  {msg.proofDocUrl && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/20 bg-black/20">
                      <a href={msg.proofDocUrl} target="_blank" rel="noreferrer" className="block relative group">
                        <img
                          src={msg.proofDocUrl}
                          alt="Proof evidence"
                          className="max-h-48 w-full object-cover transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-xs font-bold text-white">
                          <ExternalLink className="h-4 w-4" /> Open Full Attachment
                        </div>
                      </a>
                    </div>
                  )}

                  <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isMe ? "text-emerald-100/80" : "text-slate-400"}`}>
                    <span>
                      {new Date(msg.createdAt || msg.timestamp || Date.now()).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 opacity-60">
            <Radio className="h-12 w-12 text-slate-400 mb-2 animate-pulse" />
            <h3 className="text-sm font-bold">Secure Communication Channel Initialized</h3>
            <p className="text-xs max-w-xs mt-0.5">Send a message, share live GPS telemetry or attach proof evidence below.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── FOOTER / INPUT ZONE ── */}
      <div className={`border-t p-4 px-5 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
        {isResolved ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800/40 p-3.5 text-center text-xs font-extrabold text-slate-400">
            <Lock className="h-4 w-4 text-slate-500" />
            <span>Incident resolved & channel closed for new messages.</span>
          </div>
        ) : (
          <form onSubmit={(e) => handleSendMessage(e)} className="space-y-3">
            {/* Attachment Optional Drawer */}
            <AnimatePresence>
              {showAttachInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/70 p-2 text-xs">
                    <Paperclip className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />
                    <input
                      type="text"
                      placeholder="Paste Image or Document Evidence URL (https://...)"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      className="w-full bg-transparent font-mono text-xs text-white placeholder-slate-400 outline-none"
                    />
                    {attachmentUrl && (
                      <span className="text-[10px] font-bold text-emerald-400 px-2 shrink-0">Ready to attach</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              {/* Share GPS Pill Button */}
              <button
                type="button"
                onClick={handleShareGps}
                title="Broadcast Live GPS Coordinates"
                className={`flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-extrabold transition ${
                  isDark
                    ? "bg-rose-950/60 border border-rose-500/40 text-rose-400 hover:bg-rose-900/80"
                    : "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                }`}
              >
                <MapPin className="h-4 w-4 text-rose-500 animate-bounce shrink-0" />
                <span className="hidden sm:inline">Share GPS</span>
              </button>

              {/* Toggle Attach Input */}
              <button
                type="button"
                onClick={() => setShowAttachInput(!showAttachInput)}
                title="Attach Proof Evidence"
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition ${
                  showAttachInput || attachmentUrl
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : isDark
                    ? "border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Paperclip className="h-5 w-5" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message team about #${incident._id.slice(-6)}...`}
                className={`h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none transition ${
                  isDark
                    ? "border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:border-emerald-500"
                    : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                }`}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() && !attachmentUrl.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition disabled:opacity-40"
              >
                <Send className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default IncidentChatPanel;
