import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  RefreshCw,
  Radio,
  ShieldCheck,
  ArrowLeft,
  UserPlus,
  Clock,
  Users,
  ExternalLink,
} from "lucide-react";
import { incidentService } from "../incident.service";
import { IncidentChatPanel } from "../components/IncidentChatPanel";
import { IncidentStatusBadge } from "../components/IncidentStatusBadge";
import { EscalationModal } from "../components/EscalationModal";
import { useSocket } from "../../../hooks/useSocket";
import type { IncidentChatRoom, Incident } from "../../../types/incident.types";
import type { RootState } from "../../../app/store";

export default function CSChatHub() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<IncidentChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Incident | null>(null);
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeFilterTab, setActiveFilterTab] = useState<"OPEN" | "RESOLVED">("OPEN");

  // Ref to track active roomId without causing stale closures in socket handler
  const activeRoomIdRef = useRef<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await incidentService.getChatRooms();
      const sorted = [...data].sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
      setRooms(sorted);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRooms();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!socket) return;

    const refresh = () => setRefreshTrigger((p) => p + 1);
    socket.on("fleet:incident_alert", refresh);
    socket.on("new_escalation_chat", refresh);

    // Unread badge: increment count for any room that gets a message while not active
    const handleUnreadNotification = (payload: any) => {
      const roomId = String(payload.roomId);
      if (roomId === activeRoomIdRef.current) return;
      if (String(payload.senderId) === String(user?.id)) return;
      setUnreadCounts((prev) => ({ ...prev, [roomId]: payload.unreadCount || (prev[roomId] || 0) + 1 }));
    };

    socket.on("unread_notification", handleUnreadNotification);

    return () => {
      socket.off("fleet:incident_alert", refresh);
      socket.off("new_escalation_chat", refresh);
      socket.off("unread_notification", handleUnreadNotification);
    };
  }, [socket, user?.id]);

  const openChat = useCallback(async (room: IncidentChatRoom) => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    if (!room.incidentId) return;

    // Mark room as active & clear its unread count
    activeRoomIdRef.current = room._id;
    setUnreadCounts((prev) => ({ ...prev, [room._id]: 0 }));
    if (socket && room._id) {
      socket.emit("join_room", { roomId: room._id });
    }

    const incidentId =
      typeof room.incidentId === "object" ? room.incidentId._id : String(room.incidentId);

    try {
      const incident = await incidentService.getIncidentById(incidentId);
      if (!controller.signal.aborted) setActiveChat(incident);
    } catch (err: any) {
      if (err?.name !== "AbortError" && !controller.signal.aborted)
        console.error("Failed to load incident:", err);
    }
  }, []);

  const closeChat = useCallback(() => {
    activeRoomIdRef.current = null;
    setActiveChat(null);
  }, []);

  const isUnassigned = (room: IncidentChatRoom) =>
    !(room.participants || []).some(
      (p: any) => typeof p === "object" && p.role === "CS_AGENT"
    );

  const isResolved = (room: IncidentChatRoom) => {
    if (typeof room.incidentId === "object" && room.incidentId?.status)
      return room.incidentId.status === "RESOLVED" || room.incidentId.status === "CLOSED";
    return false;
  };

  const myRooms = rooms.filter((r) => !isUnassigned(r) && !isResolved(r));
  const resolvedRooms = rooms.filter((r) => !isUnassigned(r) && isResolved(r));
  const unassignedRooms = rooms.filter((r) => isUnassigned(r));

  const filteredRooms = (list: IncidentChatRoom[]) => list;

  const getIncidentTitle = (room: IncidentChatRoom): string => {
    if (typeof room.incidentId === "object" && room.incidentId?.title)
      return room.incidentId.title;
    if (room.title) return room.title;
    if (room.incidentId)
      return `Incident #${String(typeof room.incidentId === "object" ? room.incidentId._id : room.incidentId).slice(-6)}`;
    return `Room #${room._id.slice(-6)}`;
  };

  const getDriverName = (room: IncidentChatRoom): string => {
    if (typeof room.incidentId === "object" && room.incidentId?.reportedBy) {
      const rb = room.incidentId.reportedBy;
      return typeof rb === "object" ? rb.userName : "Driver";
    }
    const driverParticipant = (room.participants || []).find(
      (p: any) => typeof p === "object" && p.role === "DRIVER"
    );
    return driverParticipant ? (driverParticipant as any).userName || "Driver" : "—";
  };

  const getDescription = (room: IncidentChatRoom): string => {
    if (typeof room.incidentId === "object" && room.incidentId?.description)
      return room.incidentId.description;
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 sm:p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── HEADER ── */}
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-sky-600 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping" /> CS Support Chat Hub
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                Open Chats
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Your active conversations and unassigned incoming requests.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeChat && (
                <button
                  type="button"
                  onClick={closeChat}
                  className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Chat List
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate("/dashboard/cs-incidents")}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-sky-500/20 transition hover:scale-105 active:scale-95"
              >
                <ExternalLink className="h-4 w-4" />
                CS Incident Hub
              </button>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <AnimatePresence mode="wait">
          {activeChat ? (
            <motion.div
              key="active-chat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-[750px] w-full"
            >
              <div className="h-full flex flex-col sm:flex-row gap-6">
                <div className="flex-1 h-full shadow-2xl rounded-3xl overflow-hidden">
                  <IncidentChatPanel
                    incident={activeChat}
                    theme="light"
                    canResolve={true}
                    canEscalate={true}
                    onResolve={() => {
                      closeChat();
                      setRefreshTrigger((p) => p + 1);
                    }}
                    onEscalateClick={() => setIsEscalateOpen(true)}
                    headerSubtitle={`CS Support Room • Incident #${activeChat._id.slice(-6)}`}
                  />
                </div>

                <div className="w-full sm:w-80 flex flex-col gap-4">
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                      Active Incident Summary
                    </h3>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                        {activeChat.severity} Severity
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1">
                        {activeChat.title}
                      </h4>
                      <div className="mt-2">
                        <IncidentStatusBadge status={activeChat.status} />
                      </div>
                    </div>
                    <button
                      onClick={closeChat}
                      className="w-full rounded-xl bg-slate-900 text-white py-3 text-xs font-extrabold hover:bg-slate-800 transition shadow-md"
                    >
                      ← Back to Chat List
                    </button>
                    <button
                      onClick={() => navigate("/dashboard/cs-incidents")}
                      className="w-full rounded-xl border border-sky-300 bg-sky-50 text-sky-700 py-3 text-xs font-extrabold hover:bg-sky-100 transition"
                    >
                      Open in CS Incident Hub ↗
                    </button>
                  </div>

                  <div className="rounded-[2rem] border border-sky-200 bg-sky-50/70 p-6 shadow-sm space-y-2 text-sky-950">
                    <div className="flex items-center gap-2 text-xs font-black text-sky-800">
                      <Radio className="h-4 w-4 animate-pulse text-sky-600" /> Live Support Channel
                    </div>
                    <p className="text-xs text-sky-700 leading-relaxed">
                      You are connected to this incident's real-time chat room. Messages are delivered instantly.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="rooms-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* LEFT placeholder */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center gap-4 min-h-[300px]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Select a Conversation</h2>
                    <p className="mt-1 text-sm text-slate-500 max-w-xs">
                      Pick any chat from the right panel to open the live support room.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/dashboard/cs-incidents")}
                    className="flex items-center gap-2 rounded-2xl bg-sky-600 hover:bg-sky-700 px-5 py-3 text-xs font-black text-white shadow-md transition"
                  >
                    <ExternalLink className="h-4 w-4" /> Go to Full CS Incident Hub
                  </button>
                </div>
              </div>

              {/* RIGHT rooms list */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Chat Rooms</p>
                      <h2 className="text-base font-bold text-slate-900">My Conversations & Queue</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Open / Resolved tabs */}
                      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setActiveFilterTab("OPEN")}
                          className={`rounded-lg px-2.5 py-1 transition ${
                            activeFilterTab === "OPEN" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFilterTab("RESOLVED")}
                          className={`rounded-lg px-2.5 py-1 transition ${
                            activeFilterTab === "RESOLVED" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Resolved
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRefreshTrigger((p) => p + 1)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="space-y-3 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                      ))}
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center">
                      <ShieldCheck className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm font-bold text-slate-700">No Active Rooms</p>
                      <p className="text-xs text-slate-500">Incoming chats will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                      {activeFilterTab === "OPEN" ? (
                        <>
                          {myRooms.length > 0 && (
                            <>
                              <p className="px-1 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Users className="h-3 w-3" /> My Conversations
                              </p>
                              {myRooms.map((room, idx) => (
                                <RoomCard
                                  key={room._id}
                                  idx={idx}
                                  room={room}
                                  isUnassigned={false}
                                  isResolved={false}
                                  incidentTitle={getIncidentTitle(room)}
                                  driverName={getDriverName(room)}
                                  description={getDescription(room)}
                                  unreadCount={unreadCounts[room._id] || 0}
                                  onClick={() => openChat(room)}
                                />
                              ))}
                            </>
                          )}
                          {unassignedRooms.length > 0 && (
                            <>
                              <p className="px-1 py-1.5 mt-2 text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                                <Clock className="h-3 w-3" /> Waiting — No CS Agent Yet
                              </p>
                              {unassignedRooms.map((room, idx) => (
                                <RoomCard
                                  key={room._id}
                                  idx={idx}
                                  room={room}
                                  isUnassigned={true}
                                  isResolved={false}
                                  incidentTitle={getIncidentTitle(room)}
                                  driverName={getDriverName(room)}
                                  description={getDescription(room)}
                                  unreadCount={unreadCounts[room._id] || 0}
                                  onClick={() => openChat(room)}
                                />
                              ))}
                            </>
                          )}
                          {myRooms.length === 0 && unassignedRooms.length === 0 && (
                            <div className="py-8 text-center text-xs font-bold text-slate-400">No open conversations.</div>
                          )}
                        </>
                      ) : (
                        <>
                          {resolvedRooms.length > 0 ? (
                            <>
                              <p className="px-1 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <ShieldCheck className="h-3 w-3" /> Resolved — Read Only
                              </p>
                              {resolvedRooms.map((room, idx) => (
                                <RoomCard
                                  key={room._id}
                                  idx={idx}
                                  room={room}
                                  isUnassigned={false}
                                  isResolved={true}
                                  incidentTitle={getIncidentTitle(room)}
                                  driverName={getDriverName(room)}
                                  description={getDescription(room)}
                                  unreadCount={0}
                                  onClick={() => openChat(room)}
                                />
                              ))}
                            </>
                          ) : (
                            <div className="py-8 text-center text-xs font-bold text-slate-400">No resolved conversations yet.</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <EscalationModal
        isOpen={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        incident={activeChat}
        onSuccess={() => {
          setIsEscalateOpen(false);
          setRefreshTrigger((p) => p + 1);
        }}
      />
    </div>
  );
}

// ── RoomCard ──────────────────────────────────────────────────────────────────

function RoomCard({
  idx,
  room,
  isUnassigned,
  isResolved,
  incidentTitle,
  driverName,
  description,
  unreadCount,
  onClick,
}: {
  idx: number;
  room: IncidentChatRoom;
  isUnassigned: boolean;
  isResolved: boolean;
  incidentTitle: string;
  driverName: string;
  description: string;
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      onClick={onClick}
      className={`group flex items-center justify-between gap-3 rounded-2xl border p-4 transition cursor-pointer hover:shadow-sm ${
        isResolved
          ? "border-slate-200 bg-slate-50/60 opacity-75 hover:opacity-100"
          : unreadCount > 0
          ? "border-sky-400 bg-sky-50 shadow-sm shadow-sky-100"
          : isUnassigned
          ? "border-amber-200 bg-amber-50/60 hover:bg-amber-50 hover:border-amber-400"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-sky-400/50"
      }`}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <h3 className={`text-xs font-extrabold truncate transition-colors ${
          isResolved ? "text-slate-500"
          : unreadCount > 0 ? "text-sky-800"
          : isUnassigned ? "text-amber-900 group-hover:text-amber-700"
          : "text-slate-900 group-hover:text-sky-700"
        }`}>
          {incidentTitle}
        </h3>
        <p className="text-[11px] text-slate-500 font-medium">
          Driver: <span className="font-bold text-slate-700">{driverName}</span>
        </p>
        {description && (
          <p className="text-[11px] text-slate-400 line-clamp-1">{description}</p>
        )}
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        {unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-black text-white shadow-sm shadow-sky-400/40">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {isResolved ? (
          <span className="flex items-center gap-1 rounded-md bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
            <ShieldCheck className="h-3 w-3" /> Read Only
          </span>
        ) : isUnassigned ? (
          <span className="flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
            <UserPlus className="h-3 w-3" /> Join
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-extrabold text-sky-600 group-hover:underline">
            <MessageSquare className="h-3 w-3" /> Open Chat
          </span>
        )}
      </div>
    </motion.div>
  );
}
