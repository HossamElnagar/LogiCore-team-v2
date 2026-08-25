import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../app/store";
import api from "../../api/axios";

interface Shipment {
  _id: string;
  trackingNumber: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  codAmount: number;
}

const ACTIVE_STATUSES = ["OUT_FOR_DELIVERY", "ASSIGNED", "IN_TRANSIT"];

function getStatusColor(status: string) {
  switch (status) {
    case "DELIVERED":        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "OUT_FOR_DELIVERY": return "bg-amber-100 text-amber-700 border-amber-200";
    case "IN_TRANSIT":
    case "ASSIGNED":         return "bg-sky-100 text-sky-700 border-sky-200";
    case "INCIDENT":         return "bg-red-100 text-red-700 border-red-200";
    default:                 return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

export function DriverWorkspace() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const [shipments, setShipments]   = useState<Shipment[]>([]);
  const [loading, setLoading]       = useState(false);
  const [dutyStatus, setDutyStatus] = useState<"on_duty" | "on_break">("on_duty");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);

  // OTP modal
  const [otpShipment, setOtpShipment] = useState<Shipment | null>(null);
  const [otpCode, setOtpCode]         = useState("");
  const [timer, setTimer]             = useState(300);
  const [shake, setShake]             = useState(false);
  const timerRef = useRef<any>(null);

  // Incident modal
  const [incidentShipment, setIncidentShipment] = useState<Shipment | null>(null);
  const [reason, setReason]                     = useState("CLIENT_REFUSED");
  const [comment, setComment]                   = useState("");
  const [proofImage, setProofImage]             = useState("");
  const [submittingIncident, setSubmittingIncident] = useState(false);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/shipments");
      if (res.data.success) {
        const mine = (res.data.data || []).filter((s: any) => s.assignedDriver === user?.id);
        setShipments(mine);
      }
    } catch (err: any) {
      showNotification("error", err?.response?.data?.message || "Failed to fetch shipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchShipments(); }, [user]);

  useEffect(() => {
    if (otpShipment) {
      setTimer(300);
      timerRef.current = setInterval(() => setTimer((p) => (p <= 1 ? (clearInterval(timerRef.current), 0) : p - 1)), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [otpShipment]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpShipment) return;
    try {
      const res = await api.post(`/shipments/${otpShipment._id}/verify-otp`, { code: otpCode });
      if (res.data.success) {
        showNotification("success", "Delivery confirmed and marked as DELIVERED!");
        setOtpShipment(null);
        void fetchShipments();
      }
    } catch (err: any) {
      setShake(true); setTimeout(() => setShake(false), 500);
      showNotification("error", err?.response?.data?.message || "Incorrect OTP");
    }
  };

  const handleResendOtp = async () => {
    if (!otpShipment) return;
    try {
      const res = await api.post(`/shipments/${otpShipment._id}/generate-otp`);
      if (res.data.success) { showNotification("success", "New OTP sent!"); setTimer(300); }
    } catch (err: any) {
      showNotification("error", err?.response?.data?.message || "Failed to resend OTP");
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentShipment) return;
    setSubmittingIncident(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await api.post("/incidents/driver", {
            shipmentId: incidentShipment._id, reason, comment,
            driverLat: coords.latitude, driverLng: coords.longitude, proofImage,
          });
          if (res.data.success) {
            showNotification("success", "Incident logged.");
            setIncidentShipment(null);
            void fetchShipments();
          }
        } catch (err: any) {
          showNotification("error", err?.response?.data?.message || "Failed to report incident");
        } finally { setSubmittingIncident(false); }
      },
      () => { showNotification("error", "GPS access required."); setSubmittingIncident(false); },
      { enableHighAccuracy: true }
    );
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const activeShipments    = shipments.filter((s) => ACTIVE_STATUSES.includes(s.status));
  const deliveredShipments = shipments.filter((s) => s.status === "DELIVERED");
  const primaryShipment    = activeShipments[0] ?? null;
  const upcomingShipments  = activeShipments.slice(1);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-600">Driver Portal</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">My Workspace</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your active deliveries and report any on-ground exceptions.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Duty toggle */}
            <button
              onClick={() => setDutyStatus((s) => s === "on_duty" ? "on_break" : "on_duty")}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                dutyStatus === "on_duty"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dutyStatus === "on_duty" ? "bg-emerald-500" : "bg-amber-500"}`} />
              {dutyStatus === "on_duty" ? "On Duty" : "On Break"}
            </button>
            {/* Vehicle badge */}
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1"/>
              </svg>
              VH-{user?.id?.slice(-4)?.toUpperCase() ?? "0001"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Active */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition group-hover:opacity-20 bg-amber-500" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Active</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : activeShipments.length}
              </p>
              <p className="mt-1 text-sm text-slate-500">deliveries</p>
            </div>
            <div className="flex-shrink-0 rounded-xl p-3 bg-amber-500">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition group-hover:opacity-20 bg-emerald-500" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Completed</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : deliveredShipments.length}
              </p>
              <p className="mt-1 text-sm text-slate-500">today</p>
            </div>
            <div className="flex-shrink-0 rounded-xl p-3 bg-emerald-500">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition group-hover:opacity-20 bg-sky-500" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Total</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : shipments.length}
              </p>
              <p className="mt-1 text-sm text-slate-500">assigned</p>
            </div>
            <div className="flex-shrink-0 rounded-xl p-3 bg-sky-500">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Current Active Delivery ── */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-600">Current Delivery</p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900">Active Shipment</h3>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : primaryShipment ? (
          <div className="mt-4 space-y-4">
            {/* Shipment identity */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">{primaryShipment.customerName}</p>
                <p className="text-xs text-slate-500">#{primaryShipment.trackingNumber}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(primaryShipment.status)}`}>
                {formatStatus(primaryShipment.status)}
              </span>
            </div>

            {/* Route */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Pickup</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{primaryShipment.pickupAddress}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Drop-off</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{primaryShipment.deliveryAddress}</p>
              </div>
            </div>

            {/* Recipient + COD */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {primaryShipment.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{primaryShipment.customerName}</p>
                  <a href={`tel:${primaryShipment.customerPhone}`} className="text-xs text-sky-600 hover:underline font-medium">
                    {primaryShipment.customerPhone}
                  </a>
                </div>
              </div>
              {primaryShipment.codAmount > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  COD · {primaryShipment.codAmount} EGP
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => navigate("/operations/map")}
                className="flex flex-col items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3.5 text-sky-700 transition hover:bg-sky-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
                <span className="text-[10px] font-bold text-center leading-tight">Start Route</span>
              </button>
              <button
                onClick={() => { setOtpShipment(primaryShipment); setOtpCode(""); }}
                className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3.5 text-emerald-700 transition hover:bg-emerald-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-[10px] font-bold text-center leading-tight">Mark Arrived</span>
              </button>
              <button
                onClick={() => { setIncidentShipment(primaryShipment); setComment(""); setProofImage(""); setReason("CLIENT_REFUSED"); }}
                className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3.5 text-rose-700 transition hover:bg-rose-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span className="text-[10px] font-bold text-center leading-tight">Upload POD</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200">
            <div className="text-center">
              <p className="text-sm text-slate-500">No active deliveries</p>
              <button onClick={() => void fetchShipments()} className="mt-2 text-xs font-semibold text-sky-600 hover:underline">
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Upcoming Tasks ── */}
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setUpcomingExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-500">Shift Queue</p>
            <h3 className="mt-0.5 text-lg font-semibold text-slate-900">
              Upcoming Tasks
              {upcomingShipments.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {upcomingShipments.length}
                </span>
              )}
            </h3>
          </div>
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${upcomingExpanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {upcomingExpanded && (
          <div className="border-t border-slate-100 px-6 pb-6">
            {upcomingShipments.length > 0 ? (
              <div className="mt-4 space-y-3">
                {upcomingShipments.map((s, i) => (
                  <div key={s._id} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      {i + 2}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-slate-900">{s.customerName}</p>
                      <p className="truncate text-xs text-slate-500">{s.deliveryAddress}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(s.status)}`}>
                      {formatStatus(s.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-500">All deliveries up to date 🎉</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Report Incident ── */}
      <button
        onClick={() => {
          if (primaryShipment) { setIncidentShipment(primaryShipment); setComment(""); setProofImage(""); setReason("CLIENT_REFUSED"); }
          else showNotification("error", "No active shipment to report an incident for.");
        }}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-4 font-semibold text-red-700 transition hover:bg-red-100"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        Report Incident / Breakdown
      </button>

      {/* ══ OTP MODAL ══ */}
      {otpShipment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
          <div className={`w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl space-y-5 ${shake ? "animate-bounce" : ""}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-600">Handshake Auth</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Verify Delivery Code</h3>
              </div>
              <button onClick={() => setOtpShipment(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              Ask <strong className="text-slate-900">{otpShipment.customerName}</strong> for the 4-digit code sent to their WhatsApp/Email.
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                type="text" maxLength={4} required value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="0000"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-4 text-center text-4xl font-black tracking-[0.6em] text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Expires in: <strong className={timer < 60 ? "text-red-600" : "text-emerald-600"}>{formatTimer(timer)}</strong>
                </span>
                <button type="button" onClick={handleResendOtp} className="font-semibold text-sky-600 hover:underline">
                  Resend OTP
                </button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setOtpShipment(null)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                  Back
                </button>
                <button type="submit"
                  className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                  Verify Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ INCIDENT MODAL ══ */}
      {incidentShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-red-600">Report Exception</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Report Incident</h3>
              </div>
              <button onClick={() => setIncidentShipment(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <span><strong>Mandatory:</strong> Proximity fence check (150m) and GPS snapshot are verified automatically.</span>
            </div>
            <form onSubmit={handleReportIncident} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 transition">
                  <option value="CLIENT_REFUSED">Client Refused</option>
                  <option value="WRONG_ADDRESS">Wrong Address</option>
                  <option value="NO_ANSWER">No Answer</option>
                  <option value="DAMAGED">Damaged Goods</option>
                  <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown</option>
                  <option value="DELAY">Route Delay</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Details</label>
                <textarea required rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe the situation in detail..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 transition placeholder:text-slate-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Proof Image URL</label>
                <input type="text" value={proofImage} onChange={(e) => setProofImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 transition placeholder:text-slate-400" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setIncidentShipment(null)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submittingIncident}
                  className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60">
                  {submittingIncident ? "Checking GPS..." : "Submit Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ NOTIFICATION ══ */}
      {notification && (
        <div className={`fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border p-4 text-center text-sm font-semibold shadow-2xl ${
          notification.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
