import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Search,
  RefreshCw,
  Clock,
  PhoneCall,
  Lock,
  Radio,
  Sliders,
} from "lucide-react";
import { incidentService } from "../incident.service";
import { IncidentChatPanel } from "../components/IncidentChatPanel";
import { DriverContextPanel } from "../components/DriverContextPanel";
import { IncidentStatusBadge } from "../components/IncidentStatusBadge";
import { useSocket } from "../../../hooks/useSocket";
import type { Incident, IncidentUser } from "../../../types/incident.types";
import type { RootState } from "../../../app/store";

export const ManagerEscalationWorkspace: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket } = useSocket();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"ESCALATED" | "ALL" | "RESOLVED">("ESCALATED");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [liveAlertBanner, setLiveAlertBanner] = useState<string | null>(null);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentService.listIncidents();
      // Sort newest first
      const sorted = [...data].sort((a, b) => {
        const t1 = new Date(a.createdAt || 0).getTime();
        const t2 = new Date(b.createdAt || 0).getTime();
        return t2 - t1;
      });
      setIncidents(sorted);

      // Default select the first escalated item if available, else first item
      const escalated = sorted.filter((i) => i.status === "IN_PROGRESS" || i.escalatedByManager);
      const defaultSelection = escalated[0] || sorted[0] || null;

      if (!selectedIncident) {
        setSelectedIncident(defaultSelection);
      } else {
        const updated = sorted.find((i) => i._id === selectedIncident._id);
        if (updated) setSelectedIncident(updated);
      }
    } catch (err) {
      console.error("Failed to load escalation queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIncidents();
  }, [refreshTrigger]);

  // Socket listen for incoming priority manager summons
  useEffect(() => {
    if (!socket) return;

    const handleEscalatedCall = (payload: any) => {
      setLiveAlertBanner(`🚨 EMERGENCY HANDOVER: ${payload.escalationTitle || payload.message || "New Incident Escalated"}`);
      setRefreshTrigger((prev) => prev + 1);
      // Auto-hide alert banner after 15 seconds
      setTimeout(() => setLiveAlertBanner(null), 15000);
    };

    socket.on("new_escalation_chat", handleEscalatedCall);
    socket.on("incident:escalated", handleEscalatedCall);
    socket.on("incident:escalated_updated", handleEscalatedCall);

    return () => {
      socket.off("new_escalation_chat", handleEscalatedCall);
      socket.off("incident:escalated", handleEscalatedCall);
      socket.off("incident:escalated_updated", handleEscalatedCall);
    };
  }, [socket]);

  const handleIncidentUpdated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const filteredIncidents = incidents.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item._id.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterMode === "ESCALATED") {
      return matchesSearch && (item.status === "IN_PROGRESS" || item.escalatedByManager);
    } else if (filterMode === "RESOLVED") {
      return matchesSearch && (item.status === "RESOLVED" || item.status === "CLOSED");
    }
    return matchesSearch;
  });

  // Calculate time elapsed
  const getElapsedTime = (created: any) => {
    if (!created) return "Recent";
    const diff = Math.max(0, Date.now() - new Date(created).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins || 1}m active`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m active`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden bg-slate-950 text-slate-100 p-4 gap-4">
      {/* ── LIVE ESCALATION SIREN BANNER ── */}
      {liveAlertBanner && (
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 px-5 py-3 text-white shadow-xl shadow-rose-950/50 animate-bounce">
          <div className="flex items-center gap-3 font-extrabold text-sm">
            <Flame className="h-6 w-6 animate-pulse" />
            <span>{liveAlertBanner}</span>
          </div>
          <button
            onClick={() => setLiveAlertBanner(null)}
            className="text-xs font-bold underline bg-black/20 px-3 py-1 rounded-xl hover:bg-black/40"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* ── WORKSPACE TOP BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-rose-500/30 bg-gradient-to-r from-slate-900 via-slate-900/90 to-rose-950/40 p-4.5 px-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-600/40 font-black text-xl">
            <ShieldAlert className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              Executive Escalation Workspace
              <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-300 uppercase">
                3-Way Protocol
              </span>
            </h1>
            <p className="text-xs text-rose-200/80 font-medium">
              High-priority incident resolution hub connecting Ground Drivers, CS Representatives, and Branch Supervisors.
            </p>
          </div>
        </div>

        {/* Filter Switcher & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-2xl border border-slate-800 bg-slate-950/80 p-1 text-xs font-bold">
            <button
              onClick={() => setFilterMode("ESCALATED")}
              className={`rounded-xl px-3.5 py-1.5 transition ${
                filterMode === "ESCALATED" ? "bg-rose-600 text-white shadow-md shadow-rose-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Escalated Alerts ({incidents.filter((i) => i.status === "IN_PROGRESS" || i.escalatedByManager).length})
            </button>
            <button
              onClick={() => setFilterMode("ALL")}
              className={`rounded-xl px-3.5 py-1.5 transition ${
                filterMode === "ALL" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All Queue
            </button>
            <button
              onClick={() => setFilterMode("RESOLVED")}
              className={`rounded-xl px-3.5 py-1.5 transition ${
                filterMode === "RESOLVED" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Resolved
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Reload Queue"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-rose-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 3-WAY WORKSPACE LAYOUT (LEFT QUEUE, CENTER CHAT, RIGHT CONTEXT) ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* LEFT: ESCALATION QUEUE */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Filter emergency alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 divide-y divide-slate-800/50">
            {loading && incidents.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-500">Retrieving emergency dispatches...</div>
            ) : filteredIncidents.length > 0 ? (
              filteredIncidents.map((item) => {
                const isSelected = selectedIncident?._id === item._id;
                const reporter =
                  typeof item.reportedBy === "object" && item.reportedBy !== null
                    ? (item.reportedBy as IncidentUser).userName || "Driver Rep"
                    : "Driver Representative";
                const activeTime = getElapsedTime(item.createdAt || item.updatedAt);

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedIncident(item)}
                    className={`group relative rounded-2xl p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? "border-rose-500/80 bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 shadow-xl shadow-rose-950/40 ring-2 ring-rose-500/20"
                        : "border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/40 hover:border-slate-700"
                    }`}
                  >
                    {/* Urgency Indicator Strip */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="font-mono text-[11px] font-bold text-slate-400">#{item._id.slice(-6)}</span>
                      </div>
                      <span className="rounded-md bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-300 tracking-wider">
                        {item.severity || "CRITICAL"}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-white tracking-tight truncate">
                      {item.title}
                    </h3>
                    
                    <p className="mt-1 text-xs font-medium text-slate-400 truncate flex items-center gap-1.5">
                      <Radio className="h-3 w-3 text-emerald-400 animate-pulse" /> Reporter: <strong className="text-slate-200">{reporter}</strong>
                    </p>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/70">
                      <IncidentStatusBadge status={item.status} variant="dark" />
                      <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-400">
                        <Clock className="h-3 w-3" /> {activeTime}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 gap-2">
                <Lock className="h-10 w-10 opacity-30" />
                <p className="text-xs font-bold">No escalated items currently active in queue.</p>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: 3-WAY CHAT WORKSPACE */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <IncidentChatPanel
            incident={selectedIncident}
            theme="dark"
            canResolve={true}
            canEscalate={false} // Already escalated to manager
            onResolve={handleIncidentUpdated}
            headerSubtitle="Executive 3-Way Command Suite • Live Telemetry & Voice Bridge"
          />
        </div>

        {/* RIGHT: DRIVER TELEMETRY & DIRECT CALL PANEL */}
        <div className="hidden xl:block w-80 2xl:w-96 h-full shrink-0 overflow-hidden">
          <DriverContextPanel incident={selectedIncident} theme="dark" />
        </div>
      </div>
    </div>
  );
};

export default ManagerEscalationWorkspace;
