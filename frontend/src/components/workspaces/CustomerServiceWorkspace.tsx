import { useEffect, useMemo, useState } from "react";
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
    { label: t("customerServiceSla"), value: "93%" },
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
}
