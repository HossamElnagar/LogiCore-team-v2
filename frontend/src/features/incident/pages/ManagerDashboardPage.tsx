import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { AlertTriangle, BellRing, CheckCircle2, Clock3, ShieldAlert, TrendingUp, Users } from "lucide-react";
import api from "../../../api/axios";
import { useSocket } from "../../../hooks/useSocket";
import type { RootState } from "../../../app/store";

interface ManagerDashboardPayload {
  shipmentMetrics?: {
    total?: number;
    active?: number;
    delivered?: number;
    byStatus?: Array<{ status?: string; count?: number; percentage?: number }>;
  };
  incidentMetrics?: {
    openCount?: number;
    bySeverity?: Array<{ severity?: string; count?: number }>;
  };
  managerDashboard?: {
    openIncidents?: number;
    escalatedIncidents?: number;
    notificationCount?: number;
  };
  summary?: {
    totalCsEmployees?: number;
    activeIncidents?: number;
    resolvedIncidents?: number;
    openIncidents?: number;
    escalatedIncidents?: number;
  };
  incidentsByStatus?: Array<{ status?: string; count?: number }>;
  escalationsByDepartment?: Array<{ department?: string; count?: number }>;
  dailyIncidents?: Array<{ date?: string; count?: number }>;
  employees?: Array<{
    _id: string;
    userName?: string;
    email?: string;
    role?: string;
    isOnline?: boolean;
    totalIncidents?: number;
    openIncidents?: number;
    resolvedIncidents?: number;
    escalatedIncidents?: number;
    openChats?: number;
    resolvedChats?: number;
  }>;
  reports?: {
    dailyReport?: {
      title?: string;
      totalIncidents?: number;
      resolved?: number;
      open?: number;
      escalated?: number;
      incidents?: Array<{ _id?: string; title?: string; status?: string }>;
    };
    weeklyReport?: {
      title?: string;
      totalIncidents?: number;
      resolved?: number;
      open?: number;
      escalated?: number;
      incidents?: Array<{ _id?: string; title?: string; status?: string }>;
    };
  };
  recentIncidents?: Array<{ _id?: string; title?: string; status?: string; severity?: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "#f59e0b",
  OPEN: "#0ea5e9",
  RESOLVED: "#22c55e",
  DEFAULT: "#818cf8",
};

const getCircumference = (radius: number) => 2 * Math.PI * radius;

const getPieSegments = (
  items: Array<{ label?: string; value?: number; color?: string }>,
  radius = 36,
) => {
  const circumference = getCircumference(radius);
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value ?? 0), 0) || 1;
  let offset = 0;

  return items.map((item) => {
    const value = Math.max(0, item.value ?? 0);
    const length = (value / total) * circumference;
    const dasharray = `${length} ${circumference}`;
    const dashoffset = circumference - offset;
    offset += length;

    return {
      ...item,
      value,
      dasharray,
      dashoffset,
      circumference,
    };
  });
};

export default function ManagerDashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<ManagerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<ManagerDashboardPayload["employees"][number] | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [sectionsVisible, setSectionsVisible] = useState<Record<number, boolean>>({});

  const observeSection = (index: number) => (node: HTMLDivElement | null) => {
    sectionRefs.current[index] = node;
  };

  const getSectionClass = (index: number) =>
    sectionsVisible[index]
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-6";

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await api.get("/analytics/dashboard");
        if (response.data?.success) {
          setMetrics(response.data.data);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadMetrics();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = () => {
      void api.get("/analytics/dashboard").then((response) => {
        if (response.data?.success) {
          setMetrics(response.data.data);
        }
      });
    };

    socket.on("manager:notification", handleNotification);
    return () => socket.off("manager:notification", handleNotification);
  }, [socket]);

  const summary = useMemo(() => ({
    totalCsEmployees: metrics?.summary?.totalCsEmployees ?? 0,
    activeIncidents: metrics?.summary?.activeIncidents ?? 0,
    resolvedIncidents: metrics?.summary?.resolvedIncidents ?? 0,
    openIncidents: metrics?.summary?.openIncidents ?? 0,
    escalatedIncidents: metrics?.summary?.escalatedIncidents ?? 0,
  }), [metrics]);

  const incidentsByStatus = metrics?.incidentsByStatus ?? [];
  const dailyIncidents = metrics?.dailyIncidents ?? [];
  const totalStatusCount = incidentsByStatus.reduce((sum, item) => sum + (item.count ?? 0), 0);

  useEffect(() => {
    setChartReady(true);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const nextVisible: Record<number, boolean> = {};
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-section-index"));
          if (entry.isIntersecting) {
            nextVisible[index] = true;
          }
        });
        if (Object.keys(nextVisible).length) {
          setSectionsVisible((current) => ({ ...current, ...nextVisible }));
        }
      },
      { threshold: 0.15 },
    );

    sectionRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const statusSegments = useMemo(
    () => getPieSegments(
      incidentsByStatus.map((item) => ({
        label: item.status,
        value: item.count,
        color: STATUS_COLORS[item.status ?? "DEFAULT"] ?? STATUS_COLORS.DEFAULT,
      })),
      36,
    ),
    [incidentsByStatus],
  );

  const resolvedSegments = useMemo(
    () => getPieSegments(
      [
        { label: "Resolved", value: summary.resolvedIncidents, color: STATUS_COLORS.RESOLVED },
        { label: "Unresolved", value: summary.activeIncidents, color: STATUS_COLORS.OPEN },
      ],
      34,
    ),
    [summary.resolvedIncidents, summary.activeIncidents],
  );

  const totalResolvedUnresolved = Math.max(summary.resolvedIncidents + summary.activeIncidents, 1);

  const dailyChartData = useMemo(() => {
    const values = dailyIncidents.map((item) => item.count ?? 0);
    const labels = dailyIncidents.map((item) => item.date ?? "-");
    const maxValue = Math.max(...values, 1);
    const points = values.map((value, index) => {
      const x = dailyIncidents.length > 1 ? (index * 100) / (dailyIncidents.length - 1) : 50;
      const y = 100 - (value / maxValue) * 80 - 10;
      return { x, y, value, label: labels[index] };
    });

    const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPoints = points.length
      ? `0,100 ${linePoints} ${points[points.length - 1].x},100`
      : "";

    return { points, linePoints, areaPoints, maxValue };
  }, [dailyIncidents]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-rose-600 flex items-center gap-2">
              <BellRing className="h-4 w-4" /> CS Manager Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Welcome back, {user?.userName || "Manager"}</h1>
            <p className="mt-2 text-sm text-slate-500">Operational overview for CS employees, incidents, escalations, and manager reports.</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              {loading ? "Loading dashboard..." : `${summary.escalatedIncidents} escalated / ${summary.openIncidents} open`}
            </div>
          </div>
        </div>

        <div className={`mt-6 grid gap-4 md:grid-cols-5 transition duration-700 ${getSectionClass(0)}`} ref={observeSection(0)} data-section-index={0}>
          {[
            { label: "Total CS Employees", value: summary.totalCsEmployees, icon: Users, tone: "text-sky-600" },
            { label: "Active Incidents", value: summary.activeIncidents, icon: AlertTriangle, tone: "text-amber-600" },
            { label: "Resolved Incidents", value: summary.resolvedIncidents, icon: CheckCircle2, tone: "text-emerald-600" },
            { label: "Open Incidents", value: summary.openIncidents, icon: Clock3, tone: "text-rose-600" },
            { label: "Escalated Incidents", value: summary.escalatedIncidents, icon: TrendingUp, tone: "text-violet-600" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                  <Icon className={`h-4 w-4 ${card.tone}`} /> {card.label}
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">{card.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-700 ${getSectionClass(1)}`} ref={observeSection(1)} data-section-index={1}>
        <h2 className="text-lg font-extrabold text-slate-900">Incidents by Status</h2>
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="relative mx-auto flex h-48 w-48 items-center justify-center rounded-full bg-slate-100 shadow-inner">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <g transform="rotate(-90 50 50)">
                {statusSegments.map((segment, index) => (
                  <circle
                    key={`${segment.label}-${index}`}
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeDasharray={segment.dasharray}
                    strokeDashoffset={chartReady ? segment.dashoffset : segment.circumference}
                    style={{ transition: "stroke-dashoffset 0.9s ease, stroke-dasharray 0.9s ease" }}
                  />
                ))}
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Total</span>
              <span className="mt-1 text-3xl font-black text-slate-900">{totalStatusCount}</span>
            </div>
          </div>

          <div className="grid flex-1 gap-3">
            {incidentsByStatus.length ? incidentsByStatus.map((item) => (
              <div key={item.status} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm transition hover:border-slate-300 hover:bg-slate-100">
                <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[item.status ?? "DEFAULT"] ?? STATUS_COLORS.DEFAULT }} />
                    <span>{item.status}</span>
                  </div>
                  <span>{item.count}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(((item.count ?? 0) / Math.max(totalStatusCount, 1)) * 100)}%`,
                      background: STATUS_COLORS[item.status ?? "DEFAULT"] ?? STATUS_COLORS.DEFAULT,
                    }}
                  />
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No incident breakdown available.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-700 ${getSectionClass(3)}`} ref={observeSection(3)} data-section-index={3}>
          <h2 className="text-lg font-extrabold text-slate-900">Daily Incidents (Last 7 Days)</h2>
          <div className="mt-6">
            {dailyIncidents.length ? (
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <svg viewBox="0 0 100 100" className="h-52 w-full">
                  <defs>
                    <linearGradient id="dailyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {dailyChartData.areaPoints ? (
                    <polygon points={dailyChartData.areaPoints} fill="url(#dailyAreaGradient)" />
                  ) : null}
                  <polyline
                    points={dailyChartData.linePoints}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease", strokeDasharray: "200", strokeDashoffset: chartReady ? 0 : 200 }}
                  />
                  {dailyChartData.points.map((point) => (
                    <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="3.5" fill="#0284c7">
                      <title>{`${point.label}: ${point.value}`}</title>
                    </circle>
                  ))}
                </svg>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {dailyChartData.points.map((point) => (
                    <div key={`${point.x}-${point.value}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{point.label}</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">{point.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No recent activity.</p>
            )}
          </div>
        </div>

        <div className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-700 ${getSectionClass(4)}`} ref={observeSection(4)} data-section-index={4}>
          <h2 className="text-lg font-extrabold text-slate-900">Resolved vs Unresolved</h2>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-slate-100 shadow-inner">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <g transform="rotate(-90 50 50)">
                  {resolvedSegments.map((segment, index) => (
                    <circle
                      key={`${segment.label}-${index}`}
                      cx="50"
                      cy="50"
                      r="34"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="18"
                      strokeLinecap="round"
                      strokeDasharray={segment.dasharray}
                      strokeDashoffset={chartReady ? segment.dashoffset : segment.circumference}
                      style={{ transition: "stroke-dashoffset 0.9s ease, stroke-dasharray 0.9s ease" }}
                    />
                  ))}
                </g>
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Total</span>
                <span className="mt-1 text-3xl font-black text-slate-900">{summary.resolvedIncidents + summary.activeIncidents}</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <div className="grid gap-3">
                  {resolvedSegments.map((segment) => (
                    <div key={segment.label} className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: segment.color }} />
                        <span>{segment.label}</span>
                      </div>
                      <span>{segment.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {resolvedSegments.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-700">Legend</div>
                  <div className="mt-3 space-y-2">
                    {resolvedSegments.map((segment) => (
                      <div key={segment.label} className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="inline-flex h-3.5 w-3.5 rounded-full" style={{ background: segment.color }} />
                        <span className="font-semibold">{segment.label}</span>
                        <span className="ml-auto text-slate-500">{segment.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">CS Employees</h2>
          <div className="text-sm text-slate-500">Click an employee to open their detailed summary.</div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Open Chats</th>
                <th className="py-3 pr-4">Resolved Chats</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.employees?.length ? metrics.employees.map((employee) => (
                <tr key={employee._id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setSelectedEmployee(employee)}>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{employee.userName}</td>
                  <td className="py-3 pr-4 text-slate-600">{employee.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${employee.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {employee.isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{employee.openChats}</td>
                  <td className="py-3 pr-4 text-slate-700">{employee.resolvedChats}</td>
                </tr>
              )) : <tr><td colSpan={5} className="py-4 text-slate-500">No CS employees found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{selectedEmployee.userName}</h2>
              <p className="text-sm text-slate-500">{selectedEmployee.email}</p>
            </div>
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600" onClick={() => setSelectedEmployee(null)}>Close</button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Total incidents</div><div className="mt-2 text-2xl font-black text-slate-900">{selectedEmployee.totalIncidents}</div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Open incidents</div><div className="mt-2 text-2xl font-black text-slate-900">{selectedEmployee.openIncidents}</div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Resolved incidents</div><div className="mt-2 text-2xl font-black text-slate-900">{selectedEmployee.resolvedIncidents}</div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Escalated incidents</div><div className="mt-2 text-2xl font-black text-slate-900">{selectedEmployee.escalatedIncidents}</div></div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">Daily Report</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-700">Total Incidents</span><span className="text-sm font-black text-slate-900">{metrics?.reports?.dailyReport?.totalIncidents ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-700">Resolved</span><span className="text-sm font-black text-slate-900">{metrics?.reports?.dailyReport?.resolved ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-700">Open</span><span className="text-sm font-black text-slate-900">{metrics?.reports?.dailyReport?.open ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-700">Escalated</span><span className="text-sm font-black text-slate-900">{metrics?.reports?.dailyReport?.escalated ?? 0}</span></div>
          </div>
          <div className="mt-4 space-y-2">
            {metrics?.reports?.dailyReport?.incidents?.map((incident) => (
              <button
                key={incident._id}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => incident._id && navigate(`/incidents/${incident._id}`)}
              >
                <span className="text-sm font-semibold text-slate-700">{incident.title}</span>
                <span className="text-xs font-bold uppercase text-slate-500">{incident.status}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">Weekly Report</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-700">Total Incidents</span><span className="text-sm font-black text-slate-900">{metrics?.reports?.weeklyReport?.totalIncidents ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-700">Resolved</span><span className="text-sm font-black text-slate-900">{metrics?.reports?.weeklyReport?.resolved ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-700">Open</span><span className="text-sm font-black text-slate-900">{metrics?.reports?.weeklyReport?.open ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-700">Escalated</span><span className="text-sm font-black text-slate-900">{metrics?.reports?.weeklyReport?.escalated ?? 0}</span></div>
          </div>
          <div className="mt-4 space-y-2">
            {metrics?.reports?.weeklyReport?.incidents?.map((incident) => (
              <button
                key={incident._id}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => incident._id && navigate(`/incidents/${incident._id}`)}
              >
                <span className="text-sm font-semibold text-slate-700">{incident.title}</span>
                <span className="text-xs font-bold uppercase text-slate-500">{incident.status}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
