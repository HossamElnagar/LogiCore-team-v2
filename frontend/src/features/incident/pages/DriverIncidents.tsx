import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall,
  Wrench,
  AlertTriangle,
  PackageX,
  UserX,
  Clock,
  MapPin,
  Camera,
  Mic,
  MicOff,
  ShieldAlert,
  ShieldCheck,
  Radio,
  RefreshCw,
  Sparkles,
  Check,
  MessageSquare,
  X,
  ArrowLeft,
} from "lucide-react";
import api from "../../../api/axios";
import { IncidentChatPanel } from "../components/IncidentChatPanel";
import { IncidentStatusBadge } from "../components/IncidentStatusBadge";
import { incidentService } from "../incident.service";
import { useSocket } from "../../../hooks/useSocket";
import type { Incident } from "../../../types/incident.types";
import type { RootState } from "../../../app/store";

interface Shipment {
  _id: string;
  trackingNumber: string;
  customerName: string;
  deliveryAddress: string;
  status: string;
}

interface CategoryPreset {
  id: string;
  title: string;
  reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  icon: React.ElementType;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  description: string;
}

const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    id: "breakdown",
    title: "Vehicle Breakdown",
    reason: "VEHICLE_BREAKDOWN",
    severity: "CRITICAL",
    icon: Wrench,
    bgGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    borderColor: "border-amber-500/30 hover:border-amber-500",
    textColor: "text-amber-500",
    badgeBg: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    description: "Engine failure, flat tire, battery or towing needed",
  },
  {
    id: "accident",
    title: "Road Accident / Delay",
    reason: "ROAD_ACCIDENT",
    severity: "CRITICAL",
    icon: AlertTriangle,
    bgGradient: "from-rose-500/10 via-rose-500/5 to-transparent",
    borderColor: "border-rose-500/30 hover:border-rose-500",
    textColor: "text-rose-500",
    badgeBg: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    description: "Collision, road blockade or major traffic bottleneck",
  },
  {
    id: "cargo",
    title: "Cargo Damaged / Loss",
    reason: "CARGO_DAMAGED",
    severity: "HIGH",
    icon: PackageX,
    bgGradient: "from-purple-500/10 via-purple-500/5 to-transparent",
    borderColor: "border-purple-500/30 hover:border-purple-500",
    textColor: "text-purple-500",
    badgeBg: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    description: "Package seal broken, spilled or missing packages",
  },
  {
    id: "recipient",
    title: "Recipient Unreachable",
    reason: "CLIENT_REFUSED",
    severity: "MEDIUM",
    icon: UserX,
    bgGradient: "from-sky-500/10 via-sky-500/5 to-transparent",
    borderColor: "border-sky-500/30 hover:border-sky-500",
    textColor: "text-sky-500",
    badgeBg: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    description: "No answer at door/phone or client rejected delivery",
  },
  {
    id: "dock",
    title: "Warehouse Dock Delay",
    reason: "WAREHOUSE_DELAY",
    severity: "LOW",
    icon: Clock,
    bgGradient: "from-yellow-500/10 via-yellow-500/5 to-transparent",
    borderColor: "border-yellow-500/30 hover:border-yellow-500",
    textColor: "text-yellow-600",
    badgeBg: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
    description: "Long queue, gate checkin wait or offloading hold",
  },
];

export default function DriverIncidents() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket } = useSocket();

  // States
  const [selectedPreset, setSelectedPreset] = useState<CategoryPreset>(CATEGORY_PRESETS[0]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80");
  
  // Voice Recording Simulation
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceRecorded, setVoiceRecorded] = useState(false);

  // GPS State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>({
    lat: 30.0444,
    lng: 31.2357,
  });
  const [gpsStatus, setGpsStatus] = useState<"locating" | "captured" | "error">("captured");

  // App & Submit state
  const [reportedIncidents, setReportedIncidents] = useState<Incident[]>([]);
  const [activeChatIncident, setActiveChatIncident] = useState<Incident | null>(null);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<"ALL" | "PENDING" | "RESOLVED">("ALL");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Ref to track active chatRoomId without stale closures
  const activeRoomIdRef = useRef<string | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchShipments = async () => {
    try {
      const res = await api.get("/shipments");
      if (res.data?.success) {
        const mine = (res.data.data || []).filter(
          (s: any) => !s.assignedDriver || s.assignedDriver === user?.id
        );
        setShipments(mine);
        if (mine.length > 0 && !selectedShipmentId) {
          setSelectedShipmentId(mine[0]._id);
        }
      }
    } catch {
      // Fallback empty
    }
  };

  const fetchIncidents = async () => {
    setLoadingIncidents(true);
    try {
      const data = await incidentService.listIncidents();
      const sorted = [...data].sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setReportedIncidents(sorted);
    } catch {
      // Use fallback
    } finally {
      setLoadingIncidents(false);
    }
  };

  const captureGps = () => {
    setGpsStatus("locating");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus("captured");
        },
        () => {
          setGpsStatus("captured");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsStatus("captured");
    }
  };

  useEffect(() => {
    void fetchShipments();
    void fetchIncidents();
    captureGps();
  }, []);

  // Socket: join all incident rooms when socket connects, then track unread
  useEffect(() => {
    if (!socket || reportedIncidents.length === 0) return;
    // Join all rooms so new_message events are received
    reportedIncidents.forEach((inc) => {
      if (inc.chatRoomId) {
        const roomId = typeof inc.chatRoomId === "object"
          ? (inc.chatRoomId as any).toString()
          : String(inc.chatRoomId);
        socket.emit("join_room", { roomId });
      }
    });
  }, [socket, reportedIncidents.length]);

  // Socket: track unread messages per incident chatRoom
  useEffect(() => {
    if (!socket) return;
    const handleUnreadNotification = (payload: any) => {
      const roomId = String(payload.roomId);
      if (roomId === activeRoomIdRef.current) return;
      if (String(payload.senderId) === String(user?.id)) return;
      setReportedIncidents((prev) => {
        const matched = prev.find((inc) => String(inc.chatRoomId) === roomId);
        if (matched) {
          setUnreadCounts((counts) => ({ ...counts, [matched._id]: payload.unreadCount || (counts[matched._id] || 0) + 1 }));
        }
        return prev;
      });
    };
    socket.on("unread_notification", handleUnreadNotification);
    return () => { socket.off("unread_notification", handleUnreadNotification); };
  }, [socket, user?.id]);

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setVoiceSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setVoiceSeconds(0);
      setVoiceRecorded(false);
    } else {
      setIsRecording(false);
      setVoiceRecorded(true);
    }
  };

  const handleSelectPreset = (preset: CategoryPreset) => {
    setSelectedPreset(preset);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        shipmentId: selectedShipmentId,
        reason: selectedPreset.reason,
        title: selectedPreset.title,
        comment: details || selectedPreset.description,
        description: details || selectedPreset.description,
        severity: selectedPreset.severity,
        driverLat: gpsLocation?.lat || 30.0444,
        driverLng: gpsLocation?.lng || 31.2357,
        proofImage: photoUrl,
      };

      let newIncident: Incident;
      try {
        newIncident = await incidentService.createDriverIncident(payload);
      } catch {
        newIncident = await incidentService.createIncident({
          title: selectedPreset.title,
          description: details || selectedPreset.description,
          severity: selectedPreset.severity,
          relatedEntityType: "SHIPMENT",
          relatedEntityId: selectedShipmentId || "GENERAL",
        });
      }

      showToast("success", `Incident "${selectedPreset.title}" reported successfully! Direct chat opened.`);
      setDetails("");
      setVoiceRecorded(false);
      setVoiceSeconds(0);
      await fetchIncidents();
      
      // Open real-time chat immediately
      if (newIncident && newIncident._id) {
        const roomId = typeof newIncident.chatRoomId === "object"
          ? String((newIncident.chatRoomId as any)?._id || "")
          : String(newIncident.chatRoomId || "");
        activeRoomIdRef.current = roomId || null;
        setUnreadCounts((prev) => ({ ...prev, [newIncident._id]: 0 }));
        if (socket && roomId) {
          socket.emit("join_room", { roomId });
        }
        setActiveChatIncident(newIncident);
      }
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Failed to submit incident report.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = reportedIncidents.filter((item) => {
    if (activeFilterTab === "PENDING") return item.status !== "RESOLVED" && item.status !== "CLOSED";
    if (activeFilterTab === "RESOLVED") return item.status === "RESOLVED" || item.status === "CLOSED";
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 sm:p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* ── HEADER & SOS INTEGRATION ── */}
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-emerald-600 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Driver Safety & Exception Portal
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                Report Ground Exception
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Rapid incident reporting with instant live chat, GPS telemetry & voice memo support.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeChatIncident && (
                <button
                  type="button"
                  onClick={() => {
                    activeRoomIdRef.current = null;
                    setActiveChatIncident(null);
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Reporting Portal
                </button>
              )}

              {/* Emergency SOS Call Pill */}
              <a
                href="tel:19999"
                className="flex flex-shrink-0 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-red-500/20 transition hover:scale-105 active:scale-95"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                  <PhoneCall className="h-4 w-4 text-white animate-pulse" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-red-200">Emergency Hotline</p>
                  <p className="text-xs font-black">CALL DISPATCH SOS</p>
                </div>
              </a>
            </div>
          </div>
        </header>

        {/* ── ACTIVE LIVE CHAT VIEW (OPENS IMMEDIATELY ON SUBMISSION) ── */}
        <AnimatePresence mode="wait">
          {activeChatIncident ? (
            <motion.div
              key="active-chat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-[750px] w-full"
            >
              <div className="h-full flex flex-col sm:flex-row gap-6">
                {/* Embedded Live Chat Panel */}
                <div className="flex-1 h-full shadow-2xl rounded-3xl overflow-hidden">
                  <IncidentChatPanel
                    incident={activeChatIncident}
                    theme="light"
                    canResolve={false}
                    canEscalate={false}
                    headerSubtitle={`Live Dispatch Room for Incident #${activeChatIncident._id.slice(-6)}`}
                  />
                </div>

                {/* Quick Info & Telemetry Side on Chat View */}
                <div className="w-full sm:w-80 flex flex-col gap-4">
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                      Active Report Summary
                    </h3>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                        {activeChatIncident.severity} Severity
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1">
                        {activeChatIncident.title}
                      </h4>
                      <div className="mt-2">
                        <IncidentStatusBadge status={activeChatIncident.status} />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        activeRoomIdRef.current = null;
                        setActiveChatIncident(null);
                      }}
                      className="w-full rounded-xl bg-slate-900 text-white py-3 text-xs font-extrabold hover:bg-slate-800 transition shadow-md"
                    >
                      New Incident Report +
                    </button>
                  </div>

                  <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm space-y-2 text-emerald-950">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                      <Radio className="h-4 w-4 animate-pulse text-emerald-600" /> Ground Telemetry Locked
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Your coordinates and attachments are streaming directly to Customer Service Command and Executive Supervisors.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="portal-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* ── LEFT COLUMN: PRESETS + FORM (7 COLS) ── */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Category Presets Grid */}
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      1. Select Incident Category
                    </h2>
                    <span className="text-[11px] font-bold text-emerald-600">
                      Tap to auto-fill details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORY_PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      const isSelected = selectedPreset.id === preset.id;

                      return (
                        <motion.button
                          key={preset.id}
                          type="button"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleSelectPreset(preset)}
                          className={`relative text-left rounded-2xl border-2 p-4 transition-all duration-200 bg-white overflow-hidden ${
                            isSelected
                              ? `${preset.borderColor} ring-2 ring-emerald-400/20 bg-gradient-to-br ${preset.bgGradient}`
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${preset.badgeBg}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            {isSelected && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            )}
                          </div>

                          <h3 className="mt-2.5 text-sm font-bold text-slate-900">
                            {preset.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                            {preset.description}
                          </p>

                          <div className="mt-2.5 flex items-center gap-2">
                            <span className={`rounded-md border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${preset.badgeBg}`}>
                              {preset.severity}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Context & Form */}
                <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      2. Incident Context & Evidence
                    </h2>
                    <span className={`text-xs font-bold ${selectedPreset.textColor}`}>
                      {selectedPreset.title}
                    </span>
                  </div>

                  {/* Active Shipment Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Assigned Active Shipment
                    </label>
                    <select
                      value={selectedShipmentId}
                      onChange={(e) => setSelectedShipmentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition"
                    >
                      {shipments.length > 0 ? (
                        shipments.map((s) => (
                          <option key={s._id} value={s._id}>
                            Shipment #{s.trackingNumber} — {s.customerName} ({s.status})
                          </option>
                        ))
                      ) : (
                        <option value="">No Active Shipment Selected (General Exception)</option>
                      )}
                    </select>
                  </div>

                  {/* Driver Notes */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Additional Details / Driver Notes
                    </label>
                    <textarea
                      rows={3}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder={`Explain ${selectedPreset.title.toLowerCase()} details, road conditions or assistance needed...`}
                      className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition placeholder:text-slate-400"
                    />
                  </div>

                  {/* Attachments Section */}
                  <div className="space-y-3 pt-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Evidence Attachments
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Photo Evidence */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Camera className="h-4 w-4 text-emerald-600" /> Photo Evidence
                          </span>
                          <span className="text-[10px] text-slate-400">Captured Link</span>
                        </div>
                        <input
                          type="text"
                          value={photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Voice Memo */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Mic className="h-4 w-4 text-emerald-600" /> Voice Memo
                          </span>
                          {voiceRecorded && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Memo Saved ({voiceSeconds}s)
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition shadow-sm ${
                            isRecording
                              ? "bg-red-500 text-white animate-pulse"
                              : voiceRecorded
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {isRecording ? (
                            <>
                              <MicOff className="h-4 w-4" /> Stop ({voiceSeconds}s)
                            </>
                          ) : (
                            <>
                              <Mic className="h-4 w-4" /> {voiceRecorded ? "Re-record Memo" : "Record Voice Note"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" /> Submitting Report & Initializing Chat...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-5 w-5" /> Submit Ground Incident & Open Chat
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* ── RIGHT COLUMN: TELEMETRY + HISTORY TRACKER (5 COLS) ── */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Live GPS Telemetry Card */}
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      Live Telemetry
                    </h2>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Live GPS
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                        <MapPin className="h-5 w-5 animate-bounce" />
                      </div>
                      <div>
                        <p className="font-extrabold text-emerald-950">
                          GPS Auto-Captured
                        </p>
                        <p className="text-xs text-emerald-700 font-mono mt-0.5">
                          {gpsLocation ? `${gpsLocation.lat.toFixed(4)}° N, ${gpsLocation.lng.toFixed(4)}° E` : "Locating coordinates..."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={captureGps}
                      className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${gpsStatus === "locating" ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* My Reported Incidents History Tracker */}
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                        Incident History
                      </p>
                      <h2 className="text-base font-bold text-slate-900">
                        My Reported Issues
                      </h2>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
                      {(["ALL", "PENDING", "RESOLVED"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveFilterTab(tab)}
                          className={`rounded-lg px-2.5 py-1 transition ${
                            activeFilterTab === tab
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Incidents List */}
                  {loadingIncidents ? (
                    <div className="space-y-3 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                      ))}
                    </div>
                  ) : filteredIncidents.length > 0 ? (
                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                      {filteredIncidents.map((incident, idx) => (
                        <motion.div
                          key={incident._id || idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            const roomId = typeof incident.chatRoomId === "object"
                              ? String((incident.chatRoomId as any)?._id || "")
                              : String(incident.chatRoomId || "");
                            activeRoomIdRef.current = roomId || null;
                            setUnreadCounts((prev) => ({ ...prev, [incident._id]: 0 }));
                            if (socket && roomId) {
                              socket.emit("join_room", { roomId });
                            }
                            setActiveChatIncident(incident);
                          }}
                          className={`group flex items-center justify-between gap-3 rounded-2xl border p-4 transition cursor-pointer hover:shadow-sm ${
                            unreadCounts[incident._id] > 0
                              ? "border-emerald-400 bg-emerald-50 shadow-sm"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-emerald-500/50"
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-xs font-extrabold truncate transition-colors ${
                                unreadCounts[incident._id] > 0 ? "text-emerald-800" : "text-slate-900 group-hover:text-emerald-700"
                              }`}>
                                {incident.title}
                              </h3>
                              <span className="text-[9px] font-black uppercase text-slate-400">
                                • {incident.severity}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1">
                              {incident.description || incident.reason}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400">
                              Logged at {new Date(incident.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>

                          <div className="flex-shrink-0 flex flex-col items-end gap-2">
                            {unreadCounts[incident._id] > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-black text-white shadow-sm">
                                {unreadCounts[incident._id] > 99 ? "99+" : unreadCounts[incident._id]}
                              </span>
                            )}
                            <IncidentStatusBadge status={incident.status} />
                            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 group-hover:underline">
                              <MessageSquare className="h-3 w-3" /> Open Live Chat
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center">
                      <ShieldCheck className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm font-bold text-slate-700">No Incidents Reported</p>
                      <p className="text-xs text-slate-500">All your operational logs will appear here.</p>
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Global Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border p-4 text-center text-sm font-bold shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-300 bg-emerald-950/90 text-emerald-200"
                : "border-rose-300 bg-rose-950/90 text-rose-200"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
