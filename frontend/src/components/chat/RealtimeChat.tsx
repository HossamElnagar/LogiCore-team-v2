import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MapPin,
  Camera,
  PhoneCall,
  CheckCircle,
  UserPlus,
  Search,
  MessageSquare,
  AlertTriangle,
  Siren,
  Clock,
  Sparkles,
  Paperclip,
  Check,
  ShieldCheck,
  Radio,
  X,
  ChevronRight,
  Filter,
  UserCheck,
} from "lucide-react";
import { UserRole } from "../../types/user.types";
import type { RootState } from "../../app/store";
import { getSocket } from "../../features/chat/socket";

// ── Required Interfaces ──────────────────────────────────────────────────────

export interface ChatUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  attachmentUrl?: string;
  isLocation?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  participant: ChatUser;
  lastMessage: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "SOS";
  unreadCount: number;
  updatedAt: string;
  isResolved?: boolean;
}

export interface RealtimeChatProps {
  currentUser?: ChatUser;
  initialThreads?: ChatThread[];
  initialMessages?: Message[];
  onSendMessage?: (msg: Message) => void;
  onResolveThread?: (threadId: string) => void;
}

// ── Mock Initial Data ────────────────────────────────────────────────────────

const MOCK_THREADS: ChatThread[] = [
  {
    id: "thread-sos-01",
    title: "Overheating Engine Alert",
    participant: {
      id: "usr-driver-1",
      name: "Ahmed Hassan",
      role: UserRole.DRIVER,
    },
    lastMessage: "Engine overheating warning triggered on Highway KM 42.",
    severity: "SOS",
    unreadCount: 2,
    updatedAt: "2m ago",
    isResolved: false,
  },
  {
    id: "thread-med-02",
    title: "Seal Damage at Loading Dock",
    participant: {
      id: "usr-cs-2",
      name: "Sara Mahmoud",
      role: UserRole.CS_AGENT,
    },
    lastMessage: "Outer carton seal torn during warehouse loading.",
    severity: "MEDIUM",
    unreadCount: 1,
    updatedAt: "15m ago",
    isResolved: false,
  },
  {
    id: "thread-low-03",
    title: "Gate Clearance Wait",
    participant: {
      id: "usr-driver-3",
      name: "Kareem Said",
      role: UserRole.DRIVER,
    },
    lastMessage: "Waiting at Giza logistics gate for clearance.",
    severity: "LOW",
    unreadCount: 0,
    updatedAt: "35m ago",
    isResolved: false,
  },
];

const MOCK_MESSAGES_BY_THREAD: Record<string, Message[]> = {
  "thread-sos-01": [
    {
      id: "msg-101",
      senderId: "usr-driver-1",
      senderName: "Ahmed Hassan",
      senderRole: UserRole.DRIVER,
      text: "Engine overheating warning triggered on Highway KM 42. Pulled over safely.",
      timestamp: "10:22 AM",
    },
    {
      id: "msg-102",
      senderId: "usr-driver-1",
      senderName: "Ahmed Hassan",
      senderRole: UserRole.DRIVER,
      text: "📍 Current GPS Telemetry Shared: Cairo-Alex Desert Rd. KM 42",
      timestamp: "10:23 AM",
      isLocation: true,
    },
    {
      id: "msg-103",
      senderId: "usr-driver-1",
      senderName: "Ahmed Hassan",
      senderRole: UserRole.DRIVER,
      text: "Photo of radiator coolant leak.",
      timestamp: "10:25 AM",
      attachmentUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
    },
  ],
  "thread-med-02": [
    {
      id: "msg-201",
      senderId: "usr-cs-2",
      senderName: "Sara Mahmoud",
      senderRole: UserRole.CS_AGENT,
      text: "Outer carton seal torn during warehouse loading.",
      timestamp: "10:14 AM",
    },
  ],
  "thread-low-03": [
    {
      id: "msg-301",
      senderId: "usr-driver-3",
      senderName: "Kareem Said",
      senderRole: UserRole.DRIVER,
      text: "Waiting at Giza logistics gate for clearance.",
      timestamp: "09:50 AM",
    },
  ],
};

// Field role quick reply pills
const QUICK_PILLS = [
  "En route to destination",
  "Arrived at loading dock",
  "Need gate clearance",
  "Delay due to traffic",
];

export function RealtimeChat({
  currentUser: propsUser,
  initialThreads = MOCK_THREADS,
  initialMessages = MOCK_MESSAGES_BY_THREAD["thread-sos-01"],
  onSendMessage,
  onResolveThread,
}: RealtimeChatProps) {
  const reduxUser = useSelector((state: RootState) => state.auth.user);

  // Derive current user
  const currentUser: ChatUser = propsUser || {
    id: reduxUser?.id || "usr-[#01]",
    name: reduxUser?.userName || "LogiCore User",
    role: (reduxUser?.role as UserRole) || UserRole.DRIVER,
  };

  const isFieldRole =
    currentUser.role === UserRole.DRIVER || currentUser.role === UserRole.CS_AGENT;
  const isManagementRole = !isFieldRole;

  // States
  const [threads, setThreads] = useState<ChatThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string>(initialThreads[0]?.id || "thread-sos-01");
  const [threadMessages, setThreadMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES_BY_THREAD);
  const [inputText, setInputText] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "SOS" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "info"; message: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages, activeThreadId]);

  // Socket.io Realtime Listener Integration
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      setThreadMessages((prev) => ({
        ...prev,
        [activeThreadId]: [...(prev[activeThreadId] || []), msg],
      }));
    };

    socket.on("chat:message_received", handleNewMessage);

    return () => {
      socket.off("chat:message_received", handleNewMessage);
    };
  }, [activeThreadId]);

  // Show Toast
  const showToast = (type: "success" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Active Thread Data
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const activeMessages = threadMessages[activeThreadId] || [];

  // Optimistic Message Dispatch
  const handleSend = (overrideText?: string, isLoc?: boolean, photo?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() && !photo) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isLocation: isLoc,
      attachmentUrl: photo,
    };

    // 1. Optimistic local state update (Immediate render, no reload)
    setThreadMessages((prev) => ({
      ...prev,
      [activeThreadId]: [...(prev[activeThreadId] || []), newMsg],
    }));

    // 2. Update thread last message & timestamp
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? { ...t, lastMessage: newMsg.text || "Attachment", updatedAt: "Just now" }
          : t
      )
    );

    // 3. Emit via socket singleton if connected
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("chat:send_message", { threadId: activeThreadId, message: newMsg });
    }

    // 4. Callback prop hook
    if (onSendMessage) onSendMessage(newMsg);

    setInputText("");
  };

  // Attach Current GPS Location
  const handleAttachLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locText = `📍 Current GPS Telemetry Shared: Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`;
          handleSend(locText, true);
          showToast("info", "GPS location attached to chat!");
        },
        () => {
          handleSend("📍 Current GPS Telemetry Shared: Cairo-Alex Highway KM 42", true);
          showToast("info", "GPS location attached to chat!");
        }
      );
    } else {
      handleSend("📍 Current GPS Telemetry Shared: Cairo-Alex Highway KM 42", true);
    }
  };

  // Attach Photo Evidence
  const handleAttachPhoto = () => {
    const samplePhoto = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80";
    handleSend("Attached photo evidence of ground situation.", false, samplePhoto);
    showToast("info", "Photo evidence attached to chat!");
  };

  // Management Action: Resolve Thread
  const handleResolve = () => {
    if (!activeThread) return;

    setThreads((prev) =>
      prev.map((t) => (t.id === activeThreadId ? { ...t, isResolved: true } : t))
    );

    const systemNote: Message = {
      id: `sys-${Date.now()}`,
      senderId: "SYSTEM",
      senderName: "SYSTEM DISPATCH",
      senderRole: UserRole.OWNER,
      text: `✅ Thread marked as RESOLVED by ${currentUser.name}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setThreadMessages((prev) => ({
      ...prev,
      [activeThreadId]: [...(prev[activeThreadId] || []), systemNote],
    }));

    if (onResolveThread) onResolveThread(activeThreadId);
    showToast("success", `Thread "${activeThread.title}" resolved!`);
  };

  // Management Action: Assign Agent
  const handleAssignAgent = () => {
    showToast("info", `Thread assigned to ${currentUser.name} as Primary Handler.`);
  };

  // Severity Badge
  const renderSeverityBadge = (severity: ChatThread["severity"]) => {
    switch (severity) {
      case "SOS":
        return (
          <span className="flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-[10px] font-black text-rose-700">
            <Siren className="h-3 w-3 text-rose-600 animate-pulse" /> SOS 🚨
          </span>
        );
      case "HIGH":
        return (
          <span className="flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
            <AlertTriangle className="h-3 w-3 text-red-600" /> High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
            <Clock className="h-3 w-3 text-amber-600" /> Medium
          </span>
        );
      case "LOW":
        return (
          <span className="flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-700">
            <MessageSquare className="h-3 w-3 text-sky-600" /> Low
          </span>
        );
    }
  };

  // Filtered Management Threads
  const filteredThreads = threads.filter((t) => {
    const matchesSeverity = severityFilter === "ALL" || t.severity === severityFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.participant.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden text-slate-900">
      
      {/* ── 1. MANAGEMENT ROLES CHANNELS / THREADS SIDEBAR (LEFT) ── */}
      {isManagementRole && (
        <div className="flex w-80 flex-col border-r border-slate-200 bg-slate-50/60 p-4 space-y-3 flex-shrink-0">
          
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Dispatch Queue
              </p>
              <h2 className="text-base font-extrabold text-slate-900">
                Active Threads
              </h2>
            </div>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {filteredThreads.length}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threads..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-400 transition"
            />
          </div>

          {/* Severity Filters */}
          <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1 text-[11px] font-bold">
            {(["ALL", "SOS", "HIGH", "MEDIUM", "LOW"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSeverityFilter(tab)}
                className={`flex-1 rounded-lg py-1 transition ${
                  severityFilter === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === "SOS" ? "SOS" : tab}
              </button>
            ))}
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {filteredThreads.map((thread) => {
              const isSelected = thread.id === activeThreadId;

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    setThreads((prev) =>
                      prev.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
                    );
                  }}
                  className={`w-full text-left rounded-2xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-slate-800 bg-slate-900 text-white shadow-md"
                      : thread.isResolved
                      ? "border-slate-200 bg-slate-100/60 opacity-60"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {thread.participant.name}
                    </span>
                    {renderSeverityBadge(thread.severity)}
                  </div>

                  <p className={`text-xs font-medium truncate ${isSelected ? "text-slate-300" : "text-slate-600"}`}>
                    {thread.title}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-semibold">
                    <span className={isSelected ? "text-slate-400" : "text-slate-400"}>
                      {thread.updatedAt}
                    </span>
                    {thread.isResolved && (
                      <span className="text-emerald-500 font-extrabold flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. MAIN CONVERSATION WORKSPACE (RIGHT / FULL FIELD ROLE) ── */}
      <div className="flex flex-1 flex-col justify-between bg-white h-full min-w-0">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm">
              {isManagementRole ? activeThread?.participant.name.charAt(0).toUpperCase() : "DP"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  {isManagementRole ? activeThread?.participant.name : "Dispatch & Fleet Operations"}
                </h3>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500">
                {isManagementRole
                  ? `${activeThread?.participant.role} • ${activeThread?.title}`
                  : "Live Dispatch Support Stream"}
              </p>
            </div>
          </div>

          {/* Action Controls for Management */}
          {isManagementRole && activeThread && (
            <div className="flex items-center gap-2">
              <a
                href="tel:+201004928821"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
              >
                <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                <span>Call</span>
              </a>

              <button
                type="button"
                onClick={handleAssignAgent}
                className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-sm"
              >
                <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                <span>Assign</span>
              </button>

              {!activeThread.isResolved && (
                <button
                  type="button"
                  onClick={handleResolve}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 transition shadow-md"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Resolve</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
          <AnimatePresence initial={false}>
            {activeMessages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {/* Sender Name & Role Label */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-bold text-slate-400">
                    <span>{msg.senderName}</span>
                    <span className="rounded bg-slate-200 px-1 py-0.2 text-[9px] uppercase">
                      {msg.senderRole}
                    </span>
                    <span>• {msg.timestamp}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm font-medium shadow-sm space-y-2.5 ${
                      isMe
                        ? "bg-slate-900 text-white rounded-tr-none"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    {msg.text && <p className="leading-relaxed">{msg.text}</p>}

                    {/* Location Snippet Bubble */}
                    {msg.isLocation && (
                      <div className="flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-500/10 p-2.5 text-xs text-sky-400 font-bold">
                        <MapPin className="h-4 w-4 text-sky-400 flex-shrink-0" />
                        <span>{msg.text}</span>
                      </div>
                    )}

                    {/* Photo Attachment Bubble */}
                    {msg.attachmentUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-700/50">
                        <img
                          src={msg.attachmentUrl}
                          alt="Evidence Attachment"
                          className="h-40 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Pills for Field Roles */}
        {isFieldRole && (
          <div className="flex items-center gap-2 px-6 pt-2 overflow-x-auto">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 flex-shrink-0">
              Quick Reply:
            </span>
            {QUICK_PILLS.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => handleSend(pill)}
                className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-900 hover:text-white transition"
              >
                {pill}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar with Optimistic Updates */}
        <div className="border-t border-slate-100 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Attach GPS Location Button */}
            <button
              type="button"
              onClick={handleAttachLocation}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition"
              title="Attach GPS Telemetry Location"
            >
              <MapPin className="h-4 w-4" />
            </button>

            {/* Attach Photo Evidence Button */}
            <button
              type="button"
              onClick={handleAttachPhoto}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition"
              title="Attach Photo Evidence"
            >
              <Camera className="h-4 w-4" />
            </button>

            {/* Main Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message, telemetry update or request..."
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white transition placeholder:text-slate-400"
            />

            {/* Send Button */}
            <button
              type="submit"
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 text-xs sm:text-sm font-bold text-white shadow-md transition active:scale-95"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

      </div>

      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-300 bg-emerald-950/90 px-4 py-3 text-xs font-bold text-emerald-200 shadow-2xl backdrop-blur-md"
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
