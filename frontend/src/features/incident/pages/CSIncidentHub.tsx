import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Inbox,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { incidentService } from "../incident.service";
import { IncidentChatPanel } from "../components/IncidentChatPanel";
import { DriverContextPanel } from "../components/DriverContextPanel";
import { EscalationModal } from "../components/EscalationModal";
import { IncidentStatusBadge } from "../components/IncidentStatusBadge";
import { useSocket } from "../../../hooks/useSocket";
import type { Incident, IncidentStatus, IncidentUser } from "../../../types/incident.types";
import type { RootState } from "../../../app/store";

export const CSIncidentHub: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket, isConnected } = useSocket();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [isEscalateOpen, setIsEscalateOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const activeRoomIdRef = useRef<string | null>(null);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentService.listIncidents();
      // sort newest first
      const sorted = [...data].sort((a, b) => {
        const t1 = new Date(a.createdAt || 0).getTime();
        const t2 = new Date(b.createdAt || 0).getTime();
        return t2 - t1;
      });
      setIncidents(sorted);
      if (sorted.length > 0 && !selectedIncident) {
        setSelectedIncident(sorted[0]);
      } else if (selectedIncident) {
        const updatedCurrent = sorted.find((i) => i._id === selectedIncident._id);
        if (updatedCurrent) setSelectedIncident(updatedCurrent);
      }
    } catch (err) {
      console.error("Failed to fetch incident queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIncidents();
  }, [refreshTrigger]);

  // Real-time listener for incoming emergency reports from drivers
  useEffect(() => {
    if (!socket) return;

    const handleNewIncidentAlert = (payload: any) => {
      // Reload queue when new driver alert received
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleEscalated = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    socket.on("fleet:incident_alert", handleNewIncidentAlert);
    socket.on("incident:escalated", handleEscalated);
    socket.on("incident:escalated_updated", handleEscalated);

    // Unread badge per incident
    const handleNewMessage = (msg: any) => {
      const roomId = String(msg.roomId);
      if (roomId === activeRoomIdRef.current) return;
      if (String(msg.senderId) === String(user?.id)) return;
      setIncidents((prev) => {
        const matched = prev.find((inc) => inc.chatRoomId === roomId);
        if (matched) {
          setUnreadCounts((counts) => ({ ...counts, [matched._id]: (counts[matched._id] || 0) + 1 }));
        }
        return prev;
      });
    };
    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("fleet:incident_alert", handleNewIncidentAlert);
      socket.off("incident:escalated", handleEscalated);
      socket.off("incident:escalated_updated", handleEscalated);
      socket.off("new_message", handleNewMessage);
    };
  }, [socket]);

  const handleIncidentUpdated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const filteredIncidents = incidents.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof item.reportedBy === "object" && item.reportedBy?.userName?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" ? true : item.status.toUpperCase() === statusFilter.toUpperCase();
    const matchesSeverity = severityFilter === "ALL" ? true : item.severity?.toUpperCase() === severityFilter.toUpperCase();

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-100 dark:bg-slate-950 p-4 gap-4">
      {/* ── LEFT PANEL: INCIDENT QUEUE ── */}
      <div className="flex flex-col w-full max-w-xs sm:max-w-sm lg:w-80 xl:w-96 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shrink-0 overflow-hidden">
        {/* Queue Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
                <Radio className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-slate-800 dark:text-white">
                  CS Incident Support Hub
                </h1>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Live Queue • {incidents.length} Active
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              title="Refresh Live Queue"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
            </button>
          </div>

          {/* Search & Filters */}
          <div className="mt-3.5 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search incident ID, driver, title..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-sky-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2.5 font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-sky-500"
              >
                <option value="ALL">Status: All</option>
                <option value="OPEN">In CS Review</option>
                <option value="IN_PROGRESS">Escalated</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2.5 font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-sky-500"
              >
                <option value="ALL">Severity: All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {loading && incidents.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Loading ground alerts...</div>
          ) : filteredIncidents.length > 0 ? (
            filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?._id === inc._id;
              const driverName =
                typeof inc.reportedBy === "object" && inc.reportedBy !== null
                  ? (inc.reportedBy as IncidentUser).userName || "Driver"
                  : "Assigned Driver";

              return (
                <div
                  key={inc._id}
                  onClick={() => {
                    activeRoomIdRef.current = inc.chatRoomId || null;
                    setUnreadCounts((prev) => ({ ...prev, [inc._id]: 0 }));
                    setSelectedIncident(inc);
                  }}
                  className={`group rounded-2xl p-3.5 transition cursor-pointer border ${
                    isSelected
                      ? "border-sky-500/80 bg-gradient-to-r from-sky-50 to-indigo-50/60 dark:from-sky-950/40 dark:via-slate-900 dark:to-slate-900 shadow-md ring-2 ring-sky-500/20"
                      : unreadCounts[inc._id] > 0
                      ? "border-sky-400 bg-sky-50 dark:bg-sky-950/20"
                      : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${inc.severity === "CRITICAL" ? "bg-rose-500 animate-pulse" : "bg-sky-500"}`} />
                        <span className="text-[11px] font-mono font-bold text-slate-400">#{inc._id.slice(-6)}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {inc.severity}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">
                        {inc.title}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                        Reporter: <span className="font-bold text-slate-700 dark:text-slate-200">{driverName}</span>
                      </p>
                    </div>
                    {unreadCounts[inc._id] > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-black text-white shadow-sm shrink-0">
                        {unreadCounts[inc._id] > 99 ? "99+" : unreadCounts[inc._id]}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <IncidentStatusBadge status={inc.status} />
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(inc.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 gap-2">
              <Inbox className="h-10 w-10 opacity-30" />
              <p className="text-xs font-bold">No active incidents found in queue.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── CENTER PANEL: ACTIVE CHAT PANEL ── */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <IncidentChatPanel
          incident={selectedIncident}
          theme="light"
          canResolve={true}
          canEscalate={true}
          onResolve={handleIncidentUpdated}
          onEscalateClick={() => setIsEscalateOpen(true)}
          headerSubtitle="CS Support Command Hub • Encrypted Real-time Channel"
        />
      </div>

      {/* ── RIGHT PANEL: DRIVER & VEHICLE CONTEXT ── */}
      <div className="hidden xl:block w-80 2xl:w-96 h-full shrink-0 overflow-hidden">
        <DriverContextPanel incident={selectedIncident} theme="light" />
      </div>

      {/* ── ESCALATION MODAL ── */}
      <EscalationModal
        isOpen={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        incident={selectedIncident}
        onSuccess={handleIncidentUpdated}
      />
    </div>
  );
};

export default CSIncidentHub;
