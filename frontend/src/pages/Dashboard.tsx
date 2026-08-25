import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import type { RootState } from "../app/store";
import { CustomerServiceWorkspace } from "../components/workspaces/CustomerServiceWorkspace";
import { AccountantWorkspace } from "../components/workspaces/AccountantWorkspace";
import { OwnerWorkspace } from "../components/workspaces/OwnerWorkspace";
import { CustomerTrackingWorkspace } from "../components/workspaces/CustomerTrackingWorkspace";
import { DepartmentsManagementPanel } from "../components/workspaces/DepartmentsManagementPanel";
import { CrisisChatRoomsPanel } from "../components/workspaces/CrisisChatRoomsPanel";
import { ManagerWorkspace } from "../components/workspaces/ManagerWorkspace";
import { DriverWorkspace } from "../components/workspaces/DriverWorkspace";
import { FinanceManagerWorkspace } from "../components/workspaces/FinanceManagerWorkspace";
import { OwnerCrisisCenter } from "../components/workspaces/OwnerCrisisCenter";
import CSIncidentHub from "../features/incident/pages/CSIncidentHub";
import ManagerEscalationWorkspace from "../features/incident/pages/ManagerEscalationWorkspace";
import { useLanguage } from "../context/LanguageContext";
import { UserRole } from "../types/user.types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CashMetrics {
  totalExpected: number;
  totalCollected: number;
  discrepancy: number;
  reconciledDriversCount: number;
}

interface DashboardMetrics {
  shipmentMetrics: {
    total: number;
    active: number;
    delivered: number;
    byStatus: Array<{ status: string; count: number; percentage: number }>;
  };
  incidentMetrics: {
    openCount: number;
    bySeverity: Array<{ severity: string; count: number }>;
  };
  cashMetrics: CashMetrics;
  recentActivity: {
    shipments: Array<{
      _id: string;
      trackingNumber: string;
      customerName: string;
      status: string;
      createdAt: string;
    }>;
    incidents: Array<{
      _id: string;
      title: string;
      status: string;
      severity: string;
      createdAt: string;
    }>;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "DELAYED":
    case "CANCELLED":
      return "bg-red-100 text-red-700 border-red-200";
    case "OUT_FOR_DELIVERY":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "IN_TRANSIT":
    case "PICKED_UP":
      return "bg-sky-100 text-sky-700 border-sky-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 h-3 w-24 rounded-full bg-slate-200" />
      <div className="h-9 w-20 rounded-lg bg-slate-200" />
      <div className="mt-3 h-2 w-32 rounded-full bg-slate-100" />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;   // Tailwind bg colour class for the icon ring
  icon: React.ReactNode;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
}

function StatCard({ label, value, sub, accent, icon, trend }: StatCardProps) {
  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-600"
      : trend?.direction === "down"
      ? "text-red-500"
      : "text-slate-500";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
      {/* Subtle glow */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition group-hover:opacity-20 ${accent}`} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
          {trend && (
            <p className={`mt-2 text-xs font-semibold ${trendColor}`}>{trend.label}</p>
          )}
        </div>
        <div className={`flex-shrink-0 rounded-xl p-3 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

// ── Cash Reconciliation Card ───────────────────────────────────────────────────

function CashReconciliationCard({ cash }: { cash: CashMetrics }) {
  const collectedPct =
    cash.totalExpected > 0
      ? Math.min(100, Math.round((cash.totalCollected / cash.totalExpected) * 100))
      : 0;
  const hasShortfall = cash.discrepancy < 0;
  const hasOverage = cash.discrepancy > 0;

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-600">
            Cash Ledger · Today
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">EOD Reconciliation</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold border ${
            cash.reconciledDriversCount === 0
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {cash.reconciledDriversCount} driver{cash.reconciledDriversCount !== 1 ? "s" : ""} reconciled
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>Collected</span>
        <span>{collectedPct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            hasShortfall ? "bg-red-400" : "bg-emerald-500"
          }`}
          style={{ width: `${collectedPct}%` }}
        />
      </div>

      {/* Row figures */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Expected</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(cash.totalExpected)}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Collected</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(cash.totalCollected)}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {hasShortfall ? "Shortfall" : hasOverage ? "Overage" : "Discrepancy"}
          </p>
          <p
            className={`mt-1 text-lg font-bold ${
              hasShortfall ? "text-red-600" : hasOverage ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {hasShortfall ? "-" : hasOverage ? "+" : ""}
            {formatCurrency(Math.abs(cash.discrepancy))}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const { dir } = useLanguage();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = user?.role?.toUpperCase() || "";
  const roleWorkspace = useMemo(() => {
    // ── Special path-based overrides (always checked first) ──────────────────
    if (location.pathname.includes("cs-incidents")) {
      return <CSIncidentHub />;
    }
    if (location.pathname.includes("escalations")) {
      return <ManagerEscalationWorkspace />;
    }
    if (location.pathname.includes("departments") && (role === UserRole.OWNER)) {
      return <DepartmentsManagementPanel />;
    }
    if (location.pathname.includes("crisis")) {
      if (role === UserRole.OWNER) {
        return <OwnerCrisisCenter />;
      }
      return <CrisisChatRoomsPanel />;
    }
    if (location.pathname.includes("tracking") || role === "CUSTOMER") {
      return <CustomerTrackingWorkspace />;
    }

    // ── Role-based workspaces ─────────────────────────────────────────────────
    // Finance Manager — routed to /dashboard/accounting by resolveRolePath
    if (role === UserRole.FINANCE_MANAGER) {
      return <FinanceManagerWorkspace />;
    }

    // Finance Agent / legacy ACCOUNTANT — also on /dashboard/accounting
    if (
      location.pathname.includes("accounting") ||
      role === UserRole.ACCOUNTANT ||
      role === "ACCOUNTANT"   // backend legacy value
    ) {
      return <AccountantWorkspace />;
    }

    if (role === UserRole.CS_AGENT) {
      return <CustomerServiceWorkspace />;
    }
    if (role === UserRole.OWNER) {
      return <OwnerWorkspace />;
    }

    // Managers — CS, Fleet, and legacy DRIVER_MANAGER
    const managerRoles = [
      UserRole.CS_MANAGER,
      UserRole.DRIVER_MANAGER,
      UserRole.DRIVER_MANAGER,  // backend legacy alias
    ];
    if ((managerRoles as string[]).includes(role) && user?.departmentId) {
      return <ManagerWorkspace />;
    }

    if (role === UserRole.DRIVER) {
      return <DriverWorkspace />;
    }
    return null;
  }, [location.pathname, role, user?.departmentId]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await api.get("/analytics/dashboard");
        if (response.data.success) {
          setMetrics(response.data.data);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-600">Please log in to view the dashboard.</p>
        </div>
      </div>
    );
  }

  if (roleWorkspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 sm:px-6 lg:px-8" dir={dir}>
        <div className="mx-auto max-w-7xl">{roleWorkspace}</div>
      </div>
    );
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <div className="h-9 w-48 animate-pulse rounded-xl bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <p className="font-semibold text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const deliveryRate =
    metrics.shipmentMetrics.total > 0
      ? Math.round((metrics.shipmentMetrics.delivered / metrics.shipmentMetrics.total) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-600">
            Operations Center
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-base text-slate-500">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </header>

        {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active Shipments"
            value={metrics.shipmentMetrics.active}
            sub={`of ${metrics.shipmentMetrics.total} total`}
            accent="bg-sky-500"
            icon={
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          <StatCard
            label="Delivered"
            value={metrics.shipmentMetrics.delivered}
            sub={`${deliveryRate}% delivery rate`}
            accent="bg-emerald-500"
            trend={{ direction: deliveryRate >= 80 ? "up" : "neutral", label: `${deliveryRate}% success rate` }}
            icon={
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <StatCard
            label="Open Incidents"
            value={metrics.incidentMetrics.openCount}
            sub="Require attention"
            accent="bg-red-500"
            trend={
              metrics.incidentMetrics.openCount > 0
                ? { direction: "down", label: "Action needed" }
                : { direction: "up", label: "All clear" }
            }
            icon={
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            }
          />

          <StatCard
            label="Cash Expected Today"
            value={formatCurrency(metrics.cashMetrics.totalExpected)}
            sub={`${formatCurrency(metrics.cashMetrics.totalCollected)} collected`}
            accent={metrics.cashMetrics.discrepancy < 0 ? "bg-red-500" : "bg-amber-500"}
            trend={
              metrics.cashMetrics.discrepancy < 0
                ? {
                    direction: "down",
                    label: `${formatCurrency(Math.abs(metrics.cashMetrics.discrepancy))} shortfall`,
                  }
                : metrics.cashMetrics.discrepancy > 0
                ? {
                    direction: "neutral",
                    label: `${formatCurrency(metrics.cashMetrics.discrepancy)} overage`,
                  }
                : { direction: "up", label: "Fully reconciled" }
            }
            icon={
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>

        {/* ── Cash Reconciliation + Incident Severity ───────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <CashReconciliationCard cash={metrics.cashMetrics} />

          {/* Incident Severity Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Incidents</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Severity Breakdown</h2>
            <div className="mt-5 space-y-3">
              {metrics.incidentMetrics.bySeverity.length > 0 ? (
                metrics.incidentMetrics.bySeverity.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${getSeverityColor(item.severity)}`}
                  >
                    <span>{item.severity}</span>
                    <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-bold">
                      {item.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">No incidents recorded 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Shipment Status Breakdown ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Fleet Status</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Shipment Status Breakdown</h2>
          <div className="mt-5 space-y-4">
            {metrics.shipmentMetrics.byStatus.length > 0 ? (
              metrics.shipmentMetrics.byStatus.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{item.status.replace(/_/g, " ")}</span>
                    <span className="font-mono text-slate-500">
                      {item.count} · {item.percentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#2ec866] transition-all duration-700"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No shipment data</p>
            )}
          </div>
        </div>

        {/* ── Recent Activity ───────────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Recent Shipments */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Activity</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Recent Shipments</h2>
            <div className="mt-5 space-y-3">
              {metrics.recentActivity.shipments.length > 0 ? (
                metrics.recentActivity.shipments.map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{s.customerName}</p>
                      <p className="text-xs text-slate-500">
                        {s.trackingNumber} · {formatDate(s.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(s.status)}`}
                    >
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">No recent shipments</p>
                </div>
              )}
            </div>
          </section>

          {/* Recent Incidents */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Activity</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Recent Incidents</h2>
            <div className="mt-5 space-y-3">
              {metrics.recentActivity.incidents.length > 0 ? (
                metrics.recentActivity.incidents.map((inc) => (
                  <div
                    key={inc._id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{inc.title}</p>
                      <p className="text-xs text-slate-500">
                        {inc.status} · {formatDate(inc.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getSeverityColor(inc.severity)}`}
                    >
                      {inc.severity}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">No recent incidents</p>
                </div>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
