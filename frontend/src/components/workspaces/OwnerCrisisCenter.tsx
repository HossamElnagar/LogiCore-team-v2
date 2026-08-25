import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Siren,
  Truck,
  Gauge,
  BatteryCharging,
  Fuel,
  Send,
  Sparkles,
  Paperclip,
  Check,
  ShieldCheck,
  RefreshCw,
  Search,
  MessageSquare,
  Clock,
  User,
  CreditCard,
  Navigation,
  X,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import api from "../../api/axios";
import type { RootState } from "../../app/store";

// ── Types & Interfaces ───────────────────────────────────────────────────────

export type IncidentSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface TelemetryData {
  speed: string;
  location: string;
  fuel: string;
  battery: string;
  engineTemp: string;
  vehicleId: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: "DRIVER" | "CS_AGENT" | "OWNER" | "SYSTEM";
  text: string;
  timestamp: string;
  mediaUrl?: string;
  locationSnippet?: { lat: number; lng: number; address: string };
}

export interface CrisisThread {
  id: string;
  driverName: string;
  driverPhone: string;
  vehicleId: string;
  incidentType: string;
  severity: IncidentSeverity;
  elapsedTime: string;
  unreadCount: number;
  isResolved: boolean;
  telemetry: TelemetryData;
  messages: ChatMessage[];
}

// ── Mock Initial Escalations Data for Owner Crisis Center ───────────────────

const INITIAL_CRISIS_THREADS: CrisisThread[] = [
  {
    id: "cr-101",
    driverName: "Ahmed Hassan",
    driverPhone: "+20 100 492 8821",
    vehicleId: "VH-8921",
    incidentType: "Vehicle Breakdown",
    severity: "HIGH",
    elapsedTime: "4m ago",
    unreadCount: 2,
    isResolved: false,
    telemetry: {
      speed: "0 km/h (Stopped)",
      location: "Cairo-Alex Desert Rd. KM 42",
      fuel: "72%",
      battery: "13.8V (Normal)",
      engineTemp: "108°C (High)",
      vehicleId: "VH-8921",
    },
    messages: [
      {
        id: "m-1",
        senderName: "Ahmed Hassan",
        senderRole: "DRIVER",
        text: "Engine overheating warning triggered. Pulled over safely on the right shoulder.",
        timestamp: "10:22 AM",
        locationSnippet: {
          lat: 30.0444,
          lng: 31.2357,
          address: "Cairo-Alex Desert Rd. KM 42, Shoulder Stop",
        },
      },
      {
        id: "m-2",
        senderName: "Tarek (CS Lead)",
        senderRole: "CS_AGENT",
        text: "Customer Acme Corp has been notified of potential 30-minute arrival delay.",
        timestamp: "10:24 AM",
      },
      {
        id: "m-3",
        senderName: "Ahmed Hassan",
        senderRole: "DRIVER",
        text: "Attached photo of the coolant leak under radiator.",
        timestamp: "10:25 AM",
        mediaUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
      },
    ],
  },
  {
    id: "cr-102",
    driverName: "Mahmoud Aly",
    driverPhone: "+20 111 832 9901",
    vehicleId: "VH-4412",
    incidentType: "Cargo Damaged",
    severity: "MEDIUM",
    elapsedTime: "12m ago",
    unreadCount: 1,
    isResolved: false,
    telemetry: {
      speed: "45 km/h",
      location: "Ring Road Interchange Exit 8",
      fuel: "48%",
      battery: "14.1V",
      engineTemp: "88°C",
      vehicleId: "VH-4412",
    },
    messages: [
      {
        id: "m-10",
        senderName: "Mahmoud Aly",
        senderRole: "DRIVER",
        text: "Outer carton seal torn during warehouse loading process.",
        timestamp: "10:14 AM",
        mediaUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "m-11",
        senderName: "Sara (CS Agent)",
        senderRole: "CS_AGENT",
        text: "Awaiting Owner authorization to issue cargo replacement credit.",
        timestamp: "10:18 AM",
      },
    ],
  },
  {
    id: "cr-103",
    driverName: "Kareem Said",
    driverPhone: "+20 122 901 3411",
    vehicleId: "VH-3109",
    incidentType: "Unscheduled Stop",
    severity: "LOW",
    elapsedTime: "25m ago",
    unreadCount: 0,
    isResolved: false,
    telemetry: {
      speed: "0 km/h",
      location: "Giza Toll Plaza Dock 2",
      fuel: "85%",
      battery: "13.9V",
      engineTemp: "90°C",
      vehicleId: "VH-3109",
    },
    messages: [
      {
        id: "m-20",
        senderName: "Kareem Said",
        senderRole: "DRIVER",
        text: "Waiting for gate security clearance at Giza logistics hub.",
        timestamp: "10:01 AM",
      },
    ],
  },
];

export function OwnerCrisisCenter() {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // States
  const [threads, setThreads] = useState<CrisisThread[]>(INITIAL_CRISIS_THREADS);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("cr-101");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "info"; message: string } | null>(null);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || null;

  // Show Toast Helper
  const showToast = (type: "success" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Filtered Crisis Threads
  const filteredThreads = threads.filter((t) => {
    const matchesSeverity = severityFilter === "ALL" || t.severity === severityFilter;
    const matchesSearch =
      t.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.vehicleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.incidentType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  // Select Thread
  const handleSelectThread = (id: string) => {
    setSelectedThreadId(id);
    // Mark unread as read
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t))
    );
  };

  // Send Reply Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedThread) return;

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      senderName: user?.userName || "Owner (Executive Dispatch)",
      senderRole: "OWNER",
      text: replyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedThread.id
          ? { ...t, messages: [...t.messages, newMsg] }
          : t
      )
    );
    setReplyText("");
  };

  // Macro Action Handler
  const handleMacroAction = (macroType: "BACKUP_TRUCK" | "REROUTE" | "CUSTOMER_CREDIT") => {
    if (!selectedThread) return;

    let text = "";
    let toastMsg = "";

    switch (macroType) {
      case "BACKUP_TRUCK":
        text = "🚨 Executive Command: Backup Support Truck dispatched from Giza Central Hub. ETA: 18 minutes.";
        toastMsg = "Backup truck dispatch command transmitted!";
        break;
      case "REROUTE":
        text = "🗺️ Executive Command: Traffic detour approved. Telemetry rerouted via Ring Road Bypass.";
        toastMsg = "Reroute directive sent to driver telemetry.";
        break;
      case "CUSTOMER_CREDIT":
        text = "💳 Executive Authorization: 15% delay & damage credit approved for customer account.";
        toastMsg = "Customer credit authorization logged.";
        break;
    }

    const systemMsg: ChatMessage = {
      id: `m-macro-${Date.now()}`,
      senderName: "SYSTEM DISPATCH",
      senderRole: "SYSTEM",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedThread.id
          ? { ...t, messages: [...t.messages, systemMsg] }
          : t
      )
    );

    showToast("success", toastMsg);
  };

  // Resolve Crisis Action
  const handleResolveCrisis = () => {
    if (!selectedThread) return;

    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedThread.id
          ? {
              ...t,
              isResolved: true,
              messages: [
                ...t.messages,
                {
                  id: `m-res-${Date.now()}`,
                  senderName: "SYSTEM DISPATCH",
                  senderRole: "SYSTEM",
                  text: `✅ Crisis resolved and closed by Owner (${user?.userName || "Executive"}).`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            }
          : t
      )
    );

    showToast("success", `Crisis thread ${selectedThread.id} marked as RESOLVED.`);
  };

  // Severity Badge Component
  const renderSeverityBadge = (severity: IncidentSeverity) => {
    switch (severity) {
      case "HIGH":
        return (
          <span className="flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700">
            <Siren className="h-3 w-3 text-rose-600 animate-pulse" />
            SOS / High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Medium
          </span>
        );
      case "LOW":
        return (
          <span className="flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-700">
            <Clock className="h-3 w-3 text-sky-600" />
            Low Info
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 sm:p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* ── PAGE HEADER ── */}
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-[0.32em] text-rose-600">
                Executive Command
              </span>
              <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" />
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              Escalation & Emergency Crisis Rooms
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time telemetry, driver SOS dispatch, and executive resolution macros.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>
                {threads.filter((t) => !t.isResolved).length} Active Crises
              </span>
            </div>
          </div>
        </header>

        {/* ── MAIN CRISIS WORKSPACE (LEFT THREADS + RIGHT CHAT) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ── LEFT PANEL: ACTIVE ESCALATIONS SIDEBAR (4 COLS) ── */}
          <div className="lg:col-span-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            
            {/* Search & Severity Filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  Active Escalations
                </h2>
                <span className="text-[11px] font-bold text-slate-400">
                  {filteredThreads.length} threads
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search driver, vehicle or incident..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-rose-400 focus:bg-white transition placeholder:text-slate-400"
                />
              </div>

              {/* Severity Filter Tabs */}
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-extrabold">
                {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSeverityFilter(tab)}
                    className={`flex-1 rounded-lg py-1.5 transition text-[11px] ${
                      severityFilter === tab
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab === "HIGH" ? "SOS 🚨" : tab === "MEDIUM" ? "Med ⚠️" : tab === "LOW" ? "Low ℹ️" : "All"}
                  </button>
                ))}
              </div>
            </div>

            {/* Threads List */}
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-0.5">
              {filteredThreads.map((t) => {
                const isSelected = t.id === selectedThreadId;

                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSelectThread(t.id)}
                    className={`relative w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-rose-400 bg-gradient-to-br from-rose-50/80 to-white shadow-md ring-2 ring-rose-400/20"
                        : t.isResolved
                        ? "border-slate-200 bg-slate-50/50 opacity-70"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-extrabold text-sm text-slate-900 truncate">
                          {t.driverName}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                          {t.vehicleId}
                        </span>
                      </div>

                      {renderSeverityBadge(t.severity)}
                    </div>

                    {/* Incident Type Subtitle */}
                    <p className="text-xs font-bold text-rose-600 truncate flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      {t.incidentType}
                    </p>

                    {/* Footer Row */}
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t.elapsedTime}
                      </span>

                      {t.unreadCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white animate-pulse">
                          {t.unreadCount}
                        </span>
                      )}

                      {t.isResolved && (
                        <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Resolved
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}

              {filteredThreads.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-slate-500">
                  <p className="text-xs font-bold">No escalation threads match filter.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: CRISIS CHAT WORKSPACE (8 COLS) ── */}
          <div className="lg:col-span-8 space-y-4">
            <AnimatePresence mode="wait">
              {selectedThread ? (
                <motion.div
                  key={selectedThread.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col min-h-[640px]"
                >
                  {/* 1. HEADER BAR & TELEMETRY OVERVIEW */}
                  <div className="border-b border-slate-100 pb-4 space-y-4">
                    
                    {/* Driver Identity & Quick Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600">
                            Crisis Session #{selectedThread.id}
                          </span>
                          {selectedThread.isResolved && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Resolved
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 mt-0.5 flex items-center gap-2">
                          {selectedThread.driverName}
                          <span className="text-sm font-mono font-semibold text-slate-500">
                            ({selectedThread.vehicleId})
                          </span>
                        </h2>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Call Driver */}
                        <a
                          href={`tel:${selectedThread.driverPhone}`}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                          title="Call Driver Phone"
                        >
                          <PhoneCall className="h-4 w-4 text-emerald-600" />
                          <span>Call Driver</span>
                        </a>

                        {/* View Live GPS on Map */}
                        <button
                          type="button"
                          onClick={() => navigate("/operations/map")}
                          className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-sm"
                        >
                          <MapPin className="h-4 w-4 text-sky-600" />
                          <span>Live GPS Map</span>
                        </button>

                        {/* Resolve Crisis */}
                        {!selectedThread.isResolved && (
                          <button
                            type="button"
                            onClick={handleResolveCrisis}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 transition shadow-md"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Resolve Crisis</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Live Vehicle Telemetry Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-rose-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Speed</p>
                          <p className="font-extrabold text-slate-800">{selectedThread.telemetry.speed}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-sky-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
                          <p className="font-extrabold text-slate-800 truncate">{selectedThread.telemetry.location}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Fuel Level</p>
                          <p className="font-extrabold text-slate-800">{selectedThread.telemetry.fuel}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <BatteryCharging className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Engine Temp</p>
                          <p className="font-extrabold text-slate-800">{selectedThread.telemetry.engineTemp}</p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* 2. INTERACTIVE CHAT FEED */}
                  <div className="flex-1 my-4 space-y-3.5 overflow-y-auto max-h-[380px] p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60">
                    {selectedThread.messages.map((msg) => {
                      const isOwner = msg.senderRole === "OWNER";
                      const isSystem = msg.senderRole === "SYSTEM";
                      const isDriver = msg.senderRole === "DRIVER";

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2 text-center text-xs font-bold text-amber-800 shadow-sm max-w-md">
                              {msg.text}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOwner ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] font-extrabold text-slate-500">
                              {msg.senderName}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.2 text-[9px] font-black uppercase ${
                                isOwner
                                  ? "bg-slate-900 text-white"
                                  : isDriver
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {msg.senderRole}
                            </span>
                            <span className="text-[9px] text-slate-400">{msg.timestamp}</span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[85%] space-y-2 shadow-sm ${
                              isOwner
                                ? "bg-slate-900 text-white rounded-tr-none"
                                : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                            }`}
                          >
                            <p className="leading-relaxed font-medium">{msg.text}</p>

                            {/* Inline Media Attachment */}
                            {msg.mediaUrl && (
                              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                                <img
                                  src={msg.mediaUrl}
                                  alt="Incident Evidence"
                                  className="h-36 w-full object-cover"
                                />
                              </div>
                            )}

                            {/* Inline Location Snippet */}
                            {msg.locationSnippet && (
                              <div className="mt-2 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-xs text-sky-900 font-semibold">
                                <MapPin className="h-4 w-4 text-sky-600 flex-shrink-0" />
                                <span className="truncate">{msg.locationSnippet.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3. QUICK RESOLUTION ACTION BAR (OWNER MACROS) */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" /> Executive Resolution Macros
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleMacroAction("BACKUP_TRUCK")}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-sm"
                      >
                        <Truck className="h-3.5 w-3.5 text-amber-600" />
                        <span>Dispatch Backup Truck</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMacroAction("REROUTE")}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 transition shadow-sm"
                      >
                        <Navigation className="h-3.5 w-3.5 text-sky-600" />
                        <span>Reroute Shipment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMacroAction("CUSTOMER_CREDIT")}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Issue Customer Credit</span>
                      </button>
                    </div>

                    {/* Chat Input & Reply Composer */}
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type executive instruction or message..."
                        className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-rose-400 focus:bg-white transition"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition flex items-center gap-1.5"
                      >
                        <Send className="h-4 w-4" /> Send
                      </button>
                    </form>
                  </div>

                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[500px]"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4 border border-rose-200">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Select an Escalation Thread</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    Pick an active crisis thread from the left sidebar to monitor telemetry and execute resolution commands.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-emerald-300 bg-emerald-950/90 p-4 text-center text-sm font-bold text-emerald-200 shadow-2xl backdrop-blur-xl"
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
