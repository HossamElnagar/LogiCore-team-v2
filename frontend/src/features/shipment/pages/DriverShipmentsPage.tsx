import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import type { AppDispatch, RootState } from "../../../app/store";
import { fetchShipments, updateShipmentStatus } from "../shipmentSlice";
import type { ShipmentSummary } from "../shipment.types";

// ── Status helpers ─────────────────────────────────────────────────────────────

const ACTIVE_STATUSES   = ["ASSIGNED", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
const SCHEDULE_STATUSES = ["PENDING", "CONFIRMED", "SCHEDULED"];
const DONE_STATUSES     = ["DELIVERED"];

function getStatusBadge(status: string) {
  switch (status) {
    case "DELIVERED":        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "OUT_FOR_DELIVERY": return "bg-amber-100   text-amber-700   border-amber-200";
    case "IN_TRANSIT":       return "bg-sky-100     text-sky-700     border-sky-200";
    case "ASSIGNED":         return "bg-violet-100  text-violet-700  border-violet-200";
    case "PENDING":
    case "SCHEDULED":        return "bg-slate-100   text-slate-600   border-slate-200";
    default:                 return "bg-slate-100   text-slate-600   border-slate-200";
  }
}

function fmtStatus(s: string) {
  return s.replace(/_/g, " ");
}

function fmtTime(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Status-flow action buttons ─────────────────────────────────────────────────

interface StatusAction {
  label: string;
  nextStatus: string;
  style: string;
  icon: React.ReactNode;
}

function getStatusActions(status: string): StatusAction[] {
  const navIcon = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
    </svg>
  );
  const checkIcon = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
    </svg>
  );
  const truckIcon = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1"/>
    </svg>
  );

  switch (status) {
    case "ASSIGNED":
      return [{ label: "Confirm Pickup", nextStatus: "IN_TRANSIT",       style: "bg-sky-600 hover:bg-sky-700 text-white",           icon: checkIcon }];
    case "IN_TRANSIT":
      return [{ label: "Out for Delivery", nextStatus: "OUT_FOR_DELIVERY", style: "bg-amber-500 hover:bg-amber-600 text-white",       icon: truckIcon }];
    case "OUT_FOR_DELIVERY":
      return [{ label: "Delivered / POD",  nextStatus: "DELIVERED",        style: "bg-emerald-600 hover:bg-emerald-700 text-white",   icon: navIcon   }];
    default: return [];
  }
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 h-3 w-32 rounded-full bg-slate-200" />
          <div className="h-6 w-48 rounded-lg bg-slate-200" />
          <div className="mt-3 h-4 w-64 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// ── Hero: Active Shipment Card ─────────────────────────────────────────────────

interface HeroCardProps {
  shipment: ShipmentSummary;
  onStatusChange: (id: string, status: string) => Promise<void>;
  updating: string | null;
}

function HeroCard({ shipment: s, onStatusChange, updating }: HeroCardProps) {
  const actions = getStatusActions(s.status);

  const openNavigation = () => {
    const query = encodeURIComponent(s.deliveryAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="relative overflow-hidden rounded-[2rem] border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm"
    >
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

      {/* ── Identity row ── */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-600">
            Active Delivery · Waybill
          </p>
          <h2 className="mt-1.5 text-2xl font-bold text-slate-900">{s.customerName}</h2>
          <p className="mt-0.5 font-mono text-sm text-slate-500">#{s.trackingNumber}</p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(s.status)}`}>
            {fmtStatus(s.status)}
          </span>
          {s.codAmount && s.codAmount > 0 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
              COD · {s.codAmount} EGP
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Contact row ── */}
      <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
            {s.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{s.customerName}</p>
            <p className="text-xs text-slate-500">{s.customerPhone}</p>
          </div>
        </div>
        <a
          href={`tel:${s.customerPhone}`}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          Call
        </a>
      </div>

      {/* ── Route timeline ── */}
      <div className="mb-5 rounded-xl border border-slate-100 bg-white/70 p-4">
        {/* Pickup row */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-0.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-sky-300 bg-sky-50">
              <div className="h-2 w-2 rounded-full bg-sky-500" />
            </div>
            <div className="mt-1 h-8 w-px bg-slate-200" />
          </div>
          <div className="flex-1 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Pickup</p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-slate-800">{s.pickupAddress}</p>
          </div>
        </div>

        {/* Drop-off row */}
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-50">
            <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Drop-off</p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-slate-800">{s.deliveryAddress}</p>
            {s.estimatedDeliveryTime && (
              <p className="mt-1 text-xs text-slate-400">
                ETA · {fmtTime(s.estimatedDeliveryTime)}, {fmtDate(s.estimatedDeliveryTime)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Open Navigation ── */}
      <button
        onClick={openNavigation}
        className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 py-3.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 hover:shadow-sm"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
        Open Navigation (GPS)
      </button>

      {/* ── Status action buttons ── */}
      {actions.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${actions.length}, 1fr)` }}>
          {actions.map((action) => (
            <button
              key={action.nextStatus}
              disabled={updating === s._id}
              onClick={() => onStatusChange(s._id, action.nextStatus)}
              className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition disabled:opacity-60 ${action.style}`}
            >
              {updating === s._id ? (
                <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              ) : action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Scheduled shipment card ────────────────────────────────────────────────────

function ScheduledCard({ shipment: s, index }: { shipment: ShipmentSummary; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26, delay: index * 0.06 }}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      {/* Queue number */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
        {index + 1}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-slate-900">{s.customerName}</p>
        <p className="truncate text-xs text-slate-500 mt-0.5">{s.deliveryAddress}</p>
        {s.estimatedDeliveryTime ? (
          <p className="mt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Window · {fmtTime(s.estimatedDeliveryTime)} — {fmtDate(s.estimatedDeliveryTime)}
          </p>
        ) : (
          <p className="mt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Time Window TBD
          </p>
        )}
      </div>

      {/* Badge + COD */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(s.status)}`}>
          {fmtStatus(s.status)}
        </span>
        {s.codAmount && s.codAmount > 0 ? (
          <span className="text-[10px] font-semibold text-amber-600">{s.codAmount} EGP COD</span>
        ) : null}
      </div>
    </motion.div>
  );
}

// ── Completed shipment row ─────────────────────────────────────────────────────

function CompletedRow({ shipment: s, index }: { shipment: ShipmentSummary; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
    >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{s.customerName}</p>
        <p className="truncate text-xs text-slate-500">{s.deliveryAddress}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Delivered</p>
        {s.updatedAt ? (
          <p className="text-[10px] text-slate-400">{fmtTime(s.updatedAt)}</p>
        ) : null}
      </div>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ tab, onRefresh }: { tab: string; onRefresh: () => void }) {
  const configs: Record<string, { icon: string; title: string; sub: string; showRefresh: boolean }> = {
    active: {
      icon: "🎉",
      title: "You're all caught up!",
      sub: "No active shipments assigned right now. Check back shortly or refresh.",
      showRefresh: true,
    },
    scheduled: {
      icon: "📅",
      title: "Nothing scheduled yet",
      sub: "Your upcoming deliveries will appear here once dispatched.",
      showRefresh: false,
    },
    completed: {
      icon: "📦",
      title: "No deliveries completed yet",
      sub: "Deliveries you complete today will show up here.",
      showRefresh: false,
    },
  };

  const cfg = configs[tab] ?? configs.active;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center"
    >
      <span className="text-5xl">{cfg.icon}</span>
      <p className="mt-4 text-lg font-semibold text-slate-700">{cfg.title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{cfg.sub}</p>
      {cfg.showRefresh && (
        <button
          onClick={onRefresh}
          className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh Status
        </button>
      )}
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type Tab = "active" | "scheduled" | "completed";

export default function DriverShipmentsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { shipments, loading, error } = useSelector((state: RootState) => state.shipments);
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab]     = useState<Tab>("active");
  const [updating, setUpdating]       = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast]             = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const refresh = async () => {
    setIsRefreshing(true);
    await dispatch(fetchShipments());
    // keep spinner visible for a beat so the user sees it
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => { void refresh(); }, []);

  // Filter to only this driver's shipments
  const mine = shipments.filter((s) => !s.assignedDriver || s.assignedDriver === user?.id);

  const activeShipments    = mine.filter((s) => ACTIVE_STATUSES.includes(s.status));
  const scheduledShipments = mine.filter((s) => SCHEDULE_STATUSES.includes(s.status));
  const completedShipments = mine.filter((s) => DONE_STATUSES.includes(s.status));

  const primaryShipment = activeShipments[0] ?? null;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active",    label: "Active",         count: activeShipments.length    },
    { key: "scheduled", label: "Scheduled",      count: scheduledShipments.length },
    { key: "completed", label: "Completed",      count: completedShipments.length },
  ];

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStatusChange = async (shipmentId: string, newStatus: string) => {
    setUpdating(shipmentId);
    try {
      await dispatch(updateShipmentStatus({ id: shipmentId, payload: { status: newStatus } })).unwrap();
      showToast("success", `Status updated to ${fmtStatus(newStatus)}`);
      void refresh();
    } catch {
      showToast("error", "Failed to update status. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* ── Page Header ── */}
        <header className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">

          {/* Top row: label + refresh */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-600">Driver Portal</p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">My Assigned Deliveries</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>

            {/* Refresh button with inline spinner */}
            <button
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:pointer-events-none"
            >
              <motion.svg
                className="h-3.5 w-3.5 text-slate-500"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                animate={isRefreshing ? { rotate: 360, opacity: 1 } : { rotate: 0, opacity: 0.5 }}
                transition={isRefreshing
                  ? { rotate: { duration: 0.7, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }
                  : { opacity: { duration: 0.2 } }
                }
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </motion.svg>
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="mt-4 flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tabIndicator"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative truncate">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`relative flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
                    activeTab === tab.key ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            {error}
          </div>
        )}

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">

          {/* ACTIVE TAB */}
          {activeTab === "active" && (
            <motion.div key="active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }} className="space-y-4">

              {loading ? <Skeleton /> : primaryShipment ? (
                <>
                  <HeroCard
                    shipment={primaryShipment}
                    onStatusChange={handleStatusChange}
                    updating={updating}
                  />

                  {/* Rest of active shipments */}
                  {activeShipments.slice(1).length > 0 && (
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-slate-500">
                        Also Active
                      </p>
                      <div className="space-y-3">
                        {activeShipments.slice(1).map((s, i) => (
                          <ScheduledCard key={s._id} shipment={s} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState tab="active" onRefresh={refresh} />
              )}
            </motion.div>
          )}

          {/* SCHEDULED TAB */}
          {activeTab === "scheduled" && (
            <motion.div key="scheduled" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              {loading ? <Skeleton /> : scheduledShipments.length > 0 ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-slate-500">
                    Upcoming Queue · {scheduledShipments.length} shipment{scheduledShipments.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-3">
                    {scheduledShipments.map((s, i) => (
                      <ScheduledCard key={s._id} shipment={s} index={i} />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState tab="scheduled" onRefresh={refresh} />
              )}
            </motion.div>
          )}

          {/* COMPLETED TAB */}
          {activeTab === "completed" && (
            <motion.div key="completed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              {loading ? <Skeleton /> : completedShipments.length > 0 ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-500">
                      Completed Today
                    </p>
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                      {completedShipments.length} delivered
                    </span>
                  </div>
                  <div className="space-y-2">
                    {completedShipments.map((s, i) => (
                      <CompletedRow key={s._id} shipment={s} index={i} />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState tab="completed" onRefresh={refresh} />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border p-4 text-center text-sm font-semibold shadow-xl ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
