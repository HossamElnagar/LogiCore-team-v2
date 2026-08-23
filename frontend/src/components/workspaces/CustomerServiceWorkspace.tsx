/*import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import { useLanguage } from "../../context/LanguageContext";
import { useSocket } from "../../hooks/useSocket";
import type { RootState } from "../../app/store";

interface IncidentItem {
  _id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  shipmentId?: string;
  proofImage?: string;
  reportedBy?: string;
  driverName?: string;
  comment?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
}

function classBySeverity(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function CustomerServiceWorkspace() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { t, dir } = useLanguage();
  const { socket, isConnected } = useSocket();

  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [draftMessage, setDraftMessage] = useState("");
  const [inviteTarget, setInviteTarget] = useState("DRIVER");

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const response = await api.get("/incidents");
        if (response.data?.success) {
          const normalized = (response.data.data || []).map((item: any) => ({
            _id: item._id,
            title: item.title || item.reason || "Operational exception",
            description: item.description || item.comment || "Driver reported an issue during delivery.",
            severity: item.severity || "MEDIUM",
            status: item.status || "OPEN",
            relatedEntityType: item.relatedEntityType,
            relatedEntityId: item.relatedEntityId,
            shipmentId: item.shipmentId || item.relatedEntityId,
            proofImage: item.proofImage || item.proofDocUrl || "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
            reportedBy: item.reportedBy,
            driverName: item.driverName || "Driver",
            comment: item.comment || item.description,
          }));
          setIncidents(normalized);
          if (!selectedIncident && normalized[0]) {
            setSelectedIncident(normalized[0]);
            setDrawerOpen(true);
          }
        }
      } catch {
        setIncidents([
          {
            _id: "demo-1",
            title: "Damaged delivery",
            description: "Customer refused the parcel after packaging was punctured.",
            severity: "HIGH",
            status: "OPEN",
            relatedEntityId: "SHIP-1001",
            shipmentId: "SHIP-1001",
            proofImage: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80",
            driverName: "Ahmed",
            comment: "The carton was damaged on arrival.",
          },
        ]);
      }
    };

    void loadIncidents();
  }, [selectedIncident]);

  useEffect(() => {
    if (!selectedIncident || !socket) return;

    const roomId = selectedIncident.shipmentId || selectedIncident.relatedEntityId || selectedIncident._id;
    socket.emit("incident:room:join", { roomId });

    const handleIncoming = (payload: { roomId: string; text: string; senderName?: string; senderRole?: string }) => {
      if (payload.roomId !== roomId) return;
      setMessages((prev) => ({
        ...prev,
        [roomId]: [
          ...(prev[roomId] || []),
          {
            id: `${payload.roomId}-${Date.now()}`,
            sender: payload.senderName || "Ops",
            role: payload.senderRole || "cs",
            text: payload.text,
          },
        ],
      }));
    };

    socket.on("incident:room:message", handleIncoming);
    return () => {
      socket.off("incident:room:message", handleIncoming);
    };
  }, [selectedIncident, socket]);

  const activeRoom = useMemo(() => {
    const roomId = selectedIncident?.shipmentId || selectedIncident?.relatedEntityId || selectedIncident?._id || "default";
    return roomId;
  }, [selectedIncident]);

  const roomMessages = messages[activeRoom] || [];
  const telemetryCards = useMemo(() => [
    { label: t("customerServiceSla"), value: "9%" },
    { label: t("customerServiceActiveRoutes"), value: "124" },
    { label: t("customerServiceOpenIncidents"), value: "18" },
    { label: t("customerServiceResponseTime"), value: "4.2m" },
  ], [t]);

  const openIncident = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setDrawerOpen(true);
  };

  const sendMessage = () => {
    if (!selectedIncident || !draftMessage.trim()) return;
    const roomId = activeRoom;
    const nextMessage = {
      id: `${roomId}-${Date.now()}`,
      sender: user?.userName || "Customer Service",
      role: "cs",
      text: draftMessage.trim(),
    };
    setMessages((prev) => ({ ...prev, [roomId]: [...(prev[roomId] || []), nextMessage] }));
    socket?.emit("incident:room:message", {
      roomId,
      text: draftMessage.trim(),
      senderName: user?.userName || "Customer Service",
      senderRole: "CUSTOMER_SUPPORT",
    });
    setDraftMessage("");
  };

  const inviteParticipant = () => {
    if (!selectedIncident) return;
    const roomId = activeRoom;
    const label = inviteTarget === "DRIVER" ? selectedIncident.driverName || "driver" : inviteTarget === "MANAGER" ? "department manager" : "owner";
    const message = `${label} was invited into ${selectedIncident.title}`;
    setMessages((prev) => ({ ...prev, [roomId]: [...(prev[roomId] || []), { id: `${roomId}-${Date.now()}`, sender: "System", role: "system", text: message }] }));
    socket?.emit("incident:room:message", { roomId, text: message, senderName: "System", senderRole: "system" });
  };

  return (
    <div className="space-y-6" dir={dir}>
      <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600">{t("customerServiceWorkspaceTitle")}</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{t("customerServiceWorkspaceSubtitle")}</h2>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm text-sky-700">
          <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
          {isConnected ? "Socket live" : "Offline mode"}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {telemetryCards.map((card) => (
          <div key={card.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{t("customerServiceStatusOverview")}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">{t("customerServiceStatusOverviewSubtitle")}</h3>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[{ label: "On-time deliveries", value: "86%" }, { label: "Critical incidents", value: "7" }, { label: "Escalated rooms", value: "3" }].map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-sky-500" style={{ width: item.value.includes("%") ? item.value : "60%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Incident ledger</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Active ground exceptions</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {incidents.map((incident) => (
              <button
                key={incident._id}
                type="button"
                onClick={() => openIncident(incident)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{incident.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{incident.description}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classBySeverity(incident.severity)}`}>
                    {incident.severity}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{incident.driverName}</span>
                  <span>{incident.status}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{t("incidentChatTitle")}</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedIncident?.title || "Select an incident"}</h3>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700"
            >
              {drawerOpen ? "Hide" : "View assets"}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <select value={inviteTarget} onChange={(event) => setInviteTarget(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <option value="DRIVER">{t("incidentInviteDriver")}</option>
                <option value="MANAGER">{t("incidentInviteManager")}</option>
                <option value="OWNER">Owner</option>
              </select>
              <button type="button" onClick={inviteParticipant} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                + Invite
              </button>
              <button type="button" onClick={() => socket?.emit("incident:room:join", { roomId: activeRoom })} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                {t("incidentChatButton")}
              </button>
            </div>

            <div className="h-56 overflow-y-auto rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
              {roomMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">{t("incidentHint")}</div>
              ) : (
                <div className="space-y-2">
                  {roomMessages.map((message) => (
                    <div key={message.id} className={`rounded-2xl p-3 text-sm ${message.role === "cs" ? "bg-sky-600 text-white" : message.role === "system" ? "bg-slate-900 text-slate-100" : "bg-white text-slate-700"}`}>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-70">{message.sender}</div>
                      <div>{message.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input value={draftMessage} onChange={(event) => setDraftMessage(event.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400" placeholder="Type a message" />
              <button type="button" onClick={sendMessage} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Send</button>
            </div>
          </div>
        </section>
      </div>

      {drawerOpen && selectedIncident ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{t("incidentDrawerTitle")}</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedIncident.title}</h3>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classBySeverity(selectedIncident.severity)}`}>{selectedIncident.severity}</span>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold text-slate-700">{t("incidentDrawerStatement")}</p>
              <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{selectedIncident.comment || selectedIncident.description}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">{t("incidentDrawerAssets")}</p>
              <img src={selectedIncident.proofImage} alt="incident evidence" className="mt-3 h-52 w-full rounded-[1.25rem] object-cover" />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}*/


import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import { useLanguage } from "../../context/LanguageContext";
import { useSocket } from "../../hooks/useSocket";

interface IncidentItem {
  _id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  shipmentId?: string;
  proofImage?: string;
  reportedBy?: any;
  driverName?: string;
  comment?: string;
}

interface DashboardMetrics {
  shipmentMetrics?: {
    total: number;
    active: number;
    delivered: number;
    byStatus: Array<{ status: string; count: number; percentage: number }>;
  };
  incidentMetrics?: {
    openCount: number;
    bySeverity: Array<{ severity: string; count: number }>;
  };
  managerDashboard?: {
    openIncidents: number;
    escalatedIncidents: number;
    notificationCount: number;
  };
}

function classBySeverity(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "border-rose-200 bg-rose-50/80 text-rose-700 shadow-sm shadow-rose-100";
    case "HIGH":
      return "border-orange-200 bg-orange-50/80 text-orange-700 shadow-sm shadow-orange-100";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50/80 text-amber-700 shadow-sm shadow-amber-100";
    default:
      return "border-slate-200 bg-slate-50/80 text-slate-700 shadow-sm shadow-slate-100";
  }
}

export function CustomerServiceWorkspace() {
  const { t, dir } = useLanguage();
  const { isConnected } = useSocket();

  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);

  // Server-side Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const itemsPerPage = 10;

  // Analytics States
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  const assetsRef = useRef<HTMLDivElement | null>(null);

  // 1. جلب الإحصائيات
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoadingAnalytics(true);
        const response = await api.get("/analytics/dashboard");
        if (response.data?.success) {
          setMetrics(response.data.data);
        }
      } catch (error) {
        console.error("Failed to load dashboard analytics:", error);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    void fetchAnalytics();
  }, []);

  // 2. جلب الـ Incidents مقسمة صفحات من الـ Backend
  useEffect(() => {
    const fetchPaginatedIncidents = async () => {
      try {
        setIsLoadingIncidents(true);
        const response = await api.get(`/incidents?page=${currentPage}&limit=${itemsPerPage}`);
        
        if (response.data?.success) {
          const rawData = response.data.data || [];
          const normalized = rawData.map((item: any) => ({
            _id: item._id,
            title: item.title || item.reason || "Operational exception",
            description: item.description || item.comment || "Driver reported an issue during delivery.",
            severity: item.severity || "MEDIUM",
            status: item.status || "OPEN",
            relatedEntityType: item.relatedEntityType,
            relatedEntityId: item.relatedEntityId,
            shipmentId: item.shipmentId || item.relatedEntityId,
            proofImage: item.proofImage || item.proofDocUrl || "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
            driverName: item.reportedBy?.userName || item.driverName || "Driver",
            comment: item.comment || item.description,
          }));

          setIncidents(normalized);
          setTotalPages(response.data.pagination?.totalPages || 1);

          if (normalized.length > 0 && !selectedIncident) {
            setSelectedIncident(normalized[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load paginated incidents", error);
      } finally {
        setIsLoadingIncidents(false);
      }
    };

    void fetchPaginatedIncidents();
  }, [currentPage]);

  // حساب النسبة المئوية
  const deliveryRateNumber = useMemo(() => {
    const total = metrics?.shipmentMetrics?.total || 0;
    const delivered = metrics?.shipmentMetrics?.delivered || 0;
    if (!total) return 0;
    return Math.round((delivered / total) * 100);
  }, [metrics]);

  const criticalCount = useMemo(() => {
    const list = metrics?.incidentMetrics?.bySeverity || [];
    const critical = list.find((item) => item.severity === "CRITICAL");
    return critical ? critical.count : 0;
  }, [metrics]);

  const telemetryCards = useMemo(() => [
    { label: t("customerServiceSla"), value: `${deliveryRateNumber}%`, color: "from-sky-500 to-blue-600" },
    { label: t("customerServiceActiveRoutes"), value: String(metrics?.shipmentMetrics?.active || 0), color: "from-indigo-500 to-purple-600" },
    { label: t("customerServiceOpenIncidents"), value: String(metrics?.incidentMetrics?.openCount || 0), color: "from-amber-500 to-orange-600" },
    { label: t("customerServiceResponseTime"), value: String(metrics?.managerDashboard?.escalatedIncidents || 0), color: "from-rose-500 to-pink-600" },
  ], [t, metrics, deliveryRateNumber]);

  const handleSelectIncident = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setTimeout(() => {
      assetsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="space-y-6 transition-all duration-300" dir={dir}>
      {/* Header */}
      <header className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600">{t("customerServiceWorkspaceTitle")}</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{t("customerServiceWorkspaceSubtitle")}</h2>
          </div>
          <div className="inline-flex items-center gap-2.5 rounded-full border border-sky-100 bg-sky-50/80 px-4 py-1.5 text-sm font-medium text-sky-700 shadow-inner backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
            </span>
            {isConnected ? "Socket Live" : "Offline Mode"}
          </div>
        </div>
      </header>

      {/* 1. Telemetry Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {telemetryCards.map((card) => (
          <div key={card.label} className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className={`absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r ${card.color}`} />
            <div className="text-sm font-semibold text-slate-500">{card.label}</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {isLoadingAnalytics ? <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" /> : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Analytics Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gauge Chart */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600">Performance KPI</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Delivery Success Rate</h3>
          </div>

          <div className="my-6 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg className="h-44 w-44 transform -rotate-90">
                <circle cx="88" cy="88" r="70" stroke="currentColor" strokeWidth="14" className="text-slate-100" fill="transparent" />
                <circle
                  cx="88"
                  cy="88"
                  r="70"
                  stroke="url(#blue-gradient)"
                  strokeWidth="14"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * (isLoadingAnalytics ? 0 : deliveryRateNumber)) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  fill="transparent"
                />
                <defs>
                  <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-900">{deliveryRateNumber}%</span>
                <span className="text-xs font-medium text-slate-500">Completed</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-600">
            <span>Total Orders: <strong className="text-slate-900">{metrics?.shipmentMetrics?.total || 0}</strong></span>
            <span>Delivered: <strong className="text-emerald-600">{metrics?.shipmentMetrics?.delivered || 0}</strong></span>
          </div>
        </div>

        {/* Status Bars */}
        <div className="lg:col-span-2 rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{t("customerServiceStatusOverview")}</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">{t("customerServiceStatusOverviewSubtitle")}</h3>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {[
              { label: "On-time deliveries", value: `${deliveryRateNumber}%`, percent: deliveryRateNumber, barColor: "bg-gradient-to-r from-sky-500 to-blue-600" },
              { label: "Critical incidents", value: String(criticalCount), percent: Math.min(criticalCount * 15, 100), barColor: "bg-gradient-to-r from-rose-500 to-red-600" },
              { label: "Escalated rooms", value: String(metrics?.managerDashboard?.escalatedIncidents || 0), percent: Math.min((metrics?.managerDashboard?.escalatedIncidents || 0) * 20, 100), barColor: "bg-gradient-to-r from-amber-400 to-orange-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                  <span>{item.label}</span>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
                  <div className={`h-full rounded-full ${item.barColor} transition-all duration-1000 ease-out`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Incidents List (Server-side Paginated) */}
      <section className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Incident ledger</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Active ground exceptions</h3>
        </div>

        {isLoadingIncidents ? (
          <div className="py-12 text-center text-slate-400">Loading page {currentPage}...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {incidents.map((incident) => (
              <button
                key={incident._id}
                type="button"
                onClick={() => handleSelectIncident(incident)}
                className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                  selectedIncident?._id === incident._id
                    ? "border-sky-500 bg-sky-50/60 shadow-sm ring-2 ring-sky-300"
                    : "border-slate-200/80 bg-slate-50/50 hover:border-sky-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{incident.title}</div>
                    <div className="mt-1 text-sm text-slate-500 line-clamp-1">{incident.description}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classBySeverity(incident.severity)}`}>
                    {incident.severity}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-600">👤 {incident.driverName}</span>
                  <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-slate-700">{incident.status}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
          <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1 || isLoadingIncidents}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages || isLoadingIncidents}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* 4. Incident Evidence / Assets */}
      {selectedIncident && (
        <section ref={assetsRef} className="rounded-[2rem] border-2 border-sky-400 bg-white p-6 shadow-md ring-4 ring-sky-50 transition-all duration-300">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-sky-600">{t("incidentDrawerTitle")}</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{selectedIncident.title}</h3>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${classBySeverity(selectedIncident.severity)}`}>
              {selectedIncident.severity}
            </span>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold text-slate-700">{t("incidentDrawerStatement")}</p>
              <p className="mt-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 shadow-inner">
                {selectedIncident.comment || selectedIncident.description}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">{t("incidentDrawerAssets")}</p>
              <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-slate-200 shadow-md">
                <img src={selectedIncident.proofImage} alt="incident evidence" className="h-64 w-full object-cover transition-transform duration-300 hover:scale-105" />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}