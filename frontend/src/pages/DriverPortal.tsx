import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  Package,
  CheckCircle,
  Clock,
  Truck,
  Navigation,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Camera,
  Star,
  Zap,
  Shield,
  RotateCcw,
  X,
} from "lucide-react";
import api from "../api/axios";
import type { RootState } from "../app/store";

interface Shipment {
  _id: string;
  trackingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  codAmount: number;
  paymentMethod: string;
  deliveryLat?: number;
  deliveryLng?: number;
}

const statusColors: Record<string, string> = {
  OUT_FOR_DELIVERY: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  ASSIGNED: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  IN_TRANSIT: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  DELIVERED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  INCIDENT: "bg-rose-500/15 text-rose-400 border-rose-500/25",
};

const statusLabel: Record<string, string> = {
  OUT_FOR_DELIVERY: "Out for Delivery",
  ASSIGNED: "Assigned",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  INCIDENT: "Incident",
};

const ACTIVE_STATUSES = ["OUT_FOR_DELIVERY", "ASSIGNED", "IN_TRANSIT"];

export default function DriverPortal() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dutyStatus, setDutyStatus] = useState<"on_duty" | "on_break">("on_duty");
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // OTP Modal
  const [otpShipment, setOtpShipment] = useState<Shipment | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [timer, setTimer] = useState(300);
  const [shake, setShake] = useState(false);
  const timerRef = useRef<any>(null);

  // Incident Modal
  const [incidentShipment, setIncidentShipment] = useState<Shipment | null>(null);
  const [reason, setReason] = useState("CLIENT_REFUSED");
  const [comment, setComment] = useState("");
  const [proofImage, setProofImage] = useState("");
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
        const driverShipments = (res.data.data || []).filter(
          (s: any) => s.assignedDriver === user?.id
        );
        setShipments(driverShipments);
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
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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
      setShake(true);
      setTimeout(() => setShake(false), 500);
      showNotification("error", err?.response?.data?.message || "Incorrect OTP");
    }
  };

  const handleResendOtp = async () => {
    if (!otpShipment) return;
    try {
      const res = await api.post(`/shipments/${otpShipment._id}/generate-otp`);
      if (res.data.success) {
        showNotification("success", "New OTP sent to customer via Email & WhatsApp!");
        setTimer(300);
      }
    } catch (err: any) {
      showNotification("error", err?.response?.data?.message || "Failed to resend OTP");
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentShipment) return;
    setSubmittingIncident(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await api.post("/incidents/driver", {
            shipmentId: incidentShipment._id, reason, comment,
            driverLat: latitude, driverLng: longitude, proofImage,
          });
          if (res.data.success) {
            showNotification("success", "Incident logged successfully.");
            setIncidentShipment(null);
            void fetchShipments();
          }
        } catch (err: any) {
          showNotification("error", err?.response?.data?.message || "Incident reporting failed");
        } finally { setSubmittingIncident(false); }
      },
      () => {
        showNotification("error", "GPS access is required to report incidents.");
        setSubmittingIncident(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const formatTimer = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const activeShipments = shipments.filter((s) => ACTIVE_STATUSES.includes(s.status));
  const deliveredShipments = shipments.filter((s) => s.status === "DELIVERED");
  const primaryShipment = activeShipments[0] ?? null;
  const upcomingShipments = activeShipments.slice(1);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.08, type: "spring", stiffness: 260, damping: 22 },
    }),
  };

  return (
    <div className="min-h-screen bg-[#060d1a] text-slate-100">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-[#060d1a]/90 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">{greeting()}</p>
            <h1 className="mt-0.5 text-xl font-bold text-white">{user?.userName ?? "Driver"}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Duty Status Toggle */}
            <button
              onClick={() => setDutyStatus((s) => s === "on_duty" ? "on_break" : "on_duty")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-all duration-300 ${
                dutyStatus === "on_duty"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-400"
              }`}
            >
              <span className={`h-2 w-2 rounded-full animate-pulse ${dutyStatus === "on_duty" ? "bg-emerald-400" : "bg-amber-400"}`} />
              {dutyStatus === "on_duty" ? "On Duty" : "On Break"}
            </button>
            {/* Vehicle Badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-semibold text-slate-300">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              VH-{user?.id?.slice(-4)?.toUpperCase() ?? "0001"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">

        {/* ── METRIC CARDS ── */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              label: "Active", value: loading ? "—" : String(activeShipments.length),
              sub: "deliveries", icon: Package, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20",
            },
            {
              label: "Completed", value: loading ? "—" : String(deliveredShipments.length),
              sub: "today", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
            },
            {
              label: "Total", value: loading ? "—" : String(shipments.length),
              sub: "assigned", icon: Star, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20",
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className={`rounded-2xl border ${card.border} ${card.bg} p-4`}
            >
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${card.bg} border ${card.border}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">{card.label}</p>
              <p className="text-[10px] text-slate-600">{card.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ── PRIMARY ACTIVE DELIVERY CARD ── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" className="h-64 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
          ) : primaryShipment ? (
            <motion.div
              key="primary"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#0b1f17] via-[#0b1a1a] to-[#060d1a] p-5 shadow-2xl shadow-emerald-900/20"
            >
              {/* Glow */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

              {/* Card Header */}
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Current Delivery</span>
                  <h2 className="mt-1 text-lg font-black text-white">{primaryShipment.customerName}</h2>
                  <p className="text-xs text-slate-400">#{primaryShipment.trackingNumber}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusColors[primaryShipment.status] ?? "bg-slate-800 text-slate-400"}`}>
                  {statusLabel[primaryShipment.status] ?? primaryShipment.status}
                </span>
              </div>

              {/* Route Info */}
              <div className="mb-5 space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/30">
                    <MapPin className="h-3 w-3 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Pickup</p>
                    <p className="text-sm font-medium text-slate-200">{primaryShipment.pickupAddress}</p>
                  </div>
                </div>
                <div className="ml-3 h-4 border-l border-dashed border-slate-700" />
                <div className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Drop-off</p>
                    <p className="text-sm font-medium text-slate-200">{primaryShipment.deliveryAddress}</p>
                  </div>
                </div>
              </div>

              {/* Recipient Contact */}
              <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                    {primaryShipment.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{primaryShipment.customerName}</p>
                    <p className="text-xs text-slate-400">{primaryShipment.customerPhone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${primaryShipment.customerPhone}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                  {primaryShipment.codAmount > 0 && (
                    <div className="flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                      <Zap className="h-3 w-3" />
                      {primaryShipment.codAmount} EGP
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => navigate("/operations/map")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-2 py-3 text-indigo-400 transition-all hover:bg-indigo-500/20 hover:scale-[1.02] active:scale-95"
                >
                  <Navigation className="h-4 w-4" />
                  <span className="text-[10px] font-bold text-center leading-tight">Start Route</span>
                </button>
                <button
                  onClick={() => setOtpShipment(primaryShipment)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2 py-3 text-emerald-400 transition-all hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-95"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-[10px] font-bold text-center leading-tight">Mark Arrived</span>
                </button>
                <button
                  onClick={() => {
                    setIncidentShipment(primaryShipment);
                    setComment("");
                    setProofImage("");
                    setReason("CLIENT_REFUSED");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-2 py-3 text-rose-400 transition-all hover:bg-rose-500/20 hover:scale-[1.02] active:scale-95"
                >
                  <Camera className="h-4 w-4" />
                  <span className="text-[10px] font-bold text-center leading-tight">Upload POD</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 py-14 text-center"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                <Package className="h-6 w-6 text-slate-600" />
              </div>
              <p className="font-semibold text-slate-400">No active deliveries</p>
              <p className="mt-1 text-sm text-slate-600">All caught up for now!</p>
              <button
                onClick={() => void fetchShipments()}
                className="mt-4 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Refresh
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── UPCOMING TASKS ── */}
        {upcomingShipments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 22 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden"
          >
            <button
              onClick={() => setUpcomingExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-white">Upcoming Tasks</span>
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {upcomingShipments.length}
                </span>
              </div>
              {upcomingExpanded
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            <AnimatePresence>
              {upcomingExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-slate-800/60 border-t border-slate-800/60">
                    {upcomingShipments.map((s, i) => (
                      <motion.div
                        key={s._id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center gap-3 px-5 py-3.5"
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
                          {i + 2}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{s.customerName}</p>
                          <p className="truncate text-xs text-slate-500">{s.deliveryAddress}</p>
                        </div>
                        <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusColors[s.status] ?? "bg-slate-800 text-slate-400"}`}>
                          {statusLabel[s.status] ?? s.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── REPORT INCIDENT BUTTON ── */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 22 }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (primaryShipment) {
              setIncidentShipment(primaryShipment);
              setComment(""); setProofImage(""); setReason("CLIENT_REFUSED");
            } else {
              showNotification("error", "No active shipment to report an incident for.");
            }
          }}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 py-4 font-bold text-rose-400 transition-all hover:bg-rose-500/15"
        >
          <AlertTriangle className="h-5 w-5" />
          Report Incident / Breakdown
        </motion.button>
      </div>

      {/* ══ OTP MODAL ══ */}
      <AnimatePresence>
        {otpShipment && (
          <motion.div
            key="otp-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <motion.div
              key="otp-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className={`w-full max-w-md rounded-t-3xl border-t border-slate-800 bg-[#0b111e] p-6 space-y-5 shadow-2xl ${shake ? "animate-bounce" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Handshake Auth</span>
                  <h3 className="mt-0.5 text-lg font-black text-white">Verify Delivery Code</h3>
                </div>
                <button onClick={() => setOtpShipment(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
                Ask <strong className="text-white">{otpShipment.customerName}</strong> for the 4-digit code sent to their WhatsApp/Email.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text" maxLength={4} required value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="0000"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-4 text-center text-4xl font-black tracking-[0.6em] text-white outline-none focus:border-emerald-500 transition-colors"
                />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Expires in:{" "}
                    <strong className={timer < 60 ? "text-rose-400" : "text-emerald-400"}>{formatTimer(timer)}</strong>
                  </span>
                  <button type="button" onClick={handleResendOtp} className="font-bold text-emerald-400 hover:underline">
                    Resend OTP
                  </button>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setOtpShipment(null)}
                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-colors">
                    Back
                  </button>
                  <button type="submit"
                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" /> Verify Code
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ INCIDENT MODAL ══ */}
      <AnimatePresence>
        {incidentShipment && (
          <motion.div
            key="incident-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <motion.div
              key="incident-sheet"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0b111e] p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Report Exception</span>
                  <h3 className="mt-0.5 text-lg font-black text-white">Report Incident</h3>
                </div>
                <button onClick={() => setIncidentShipment(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-rose-900/50 bg-rose-950/20 p-3 text-xs text-rose-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                <span><strong>Mandatory:</strong> Proximity fence check (150m) and GPS snapshot are verified automatically.</span>
              </div>

              <form onSubmit={handleReportIncident} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500 transition-colors">
                    <option value="CLIENT_REFUSED">Client Refused</option>
                    <option value="WRONG_ADDRESS">Wrong Address</option>
                    <option value="NO_ANSWER">No Answer</option>
                    <option value="DAMAGED">Damaged Goods</option>
                    <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown</option>
                    <option value="DELAY">Route Delay</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Details</label>
                  <textarea required rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe the situation in detail..."
                    className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500 transition-colors placeholder:text-slate-600" />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Proof Image URL</label>
                  <input type="text" value={proofImage} onChange={(e) => setProofImage(e.target.value)}
                    placeholder="https://... (photo link)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500 transition-colors placeholder:text-slate-600" />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setIncidentShipment(null)}
                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingIncident}
                    className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {submittingIncident ? "Checking GPS..." : "Submit Incident"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ GLOBAL NOTIFICATION BANNER ══ */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key="notification"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border p-4 text-center text-sm font-semibold shadow-2xl backdrop-blur-xl ${
              notification.type === "success"
                ? "border-emerald-800 bg-emerald-950/95 text-emerald-300"
                : "border-rose-800 bg-rose-950/95 text-rose-300"
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
