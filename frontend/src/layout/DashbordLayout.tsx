import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar/Sidebar";
import { useSocket } from "../hooks/useSocket";

// ── Types ─────────────────────────────────────────────────────────────────────

interface IncidentAlert {
  id: string; // Toast ID
  incidentId: string;
  title: string;
  severity: string;
  trackingNumber: string;
  timestamp: string;
}

export default function DashbordLayout() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState<IncidentAlert[]>([]);

  // Listen to live incident alert broadcasts
  useEffect(() => {
    if (!socket) return;

    const handleIncidentAlert = (data: Omit<IncidentAlert, "id">) => {
      const toastId = Math.random().toString(36).substring(2, 9);
      const newAlert: IncidentAlert = {
        ...data,
        id: toastId,
      };

      setAlerts((prev) => [newAlert, ...prev]);

      // Automatically auto-dismiss toast after 7 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== toastId));
      }, 7000);
    };

    socket.on("fleet:incident_alert", handleIncidentAlert);

    return () => {
      socket.off("fleet:incident_alert", handleIncidentAlert);
    };
  }, [socket]);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const getAlertColors = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return {
          bg: "bg-gradient-to-r from-red-600 to-rose-600",
          border: "border-red-400/30",
          accent: "bg-red-700 text-white",
          text: "text-white",
          subtext: "text-red-100",
        };
      case "HIGH":
        return {
          bg: "bg-gradient-to-r from-orange-500 to-amber-500",
          border: "border-orange-400/30",
          accent: "bg-orange-600 text-white",
          text: "text-white",
          subtext: "text-orange-50",
        };
      default:
        return {
          bg: "bg-gradient-to-r from-amber-500 to-yellow-500",
          border: "border-amber-400/30",
          accent: "bg-amber-600 text-slate-900",
          text: "text-slate-900",
          subtext: "text-slate-800",
        };
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0f172a]">
      {/* Toast Notification Layer */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {alerts.map((alert) => {
          const colors = getAlertColors(alert.severity);
          return (
            <div
              key={alert.id}
              className={`
                pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border
                shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in cursor-pointer
                ${colors.bg} ${colors.border}
              `}
              onClick={() => {
                navigate(`/dashboard/cs-incidents`);
                removeAlert(alert.id);
              }}
              role="alert"
              aria-live="assertive"
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between p-4">
                <div className="flex gap-3">
                  {/* Danger Bell icon */}
                  <div className={`rounded-xl p-2.5 ${colors.accent}`}>
                    <svg className="h-5 w-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <span className="inline-block rounded-full bg-black/15 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase text-white">
                      {alert.severity} Incident
                    </span>
                    <p className={`mt-1 font-bold text-sm leading-snug ${colors.text}`}>
                      {alert.title}
                    </p>
                  </div>
                </div>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAlert(alert.id);
                  }}
                  className="rounded-lg p-1 text-white/70 transition hover:bg-black/10 hover:text-white"
                  aria-label="Close alert"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Alert Footer details */}
              <div className="flex items-center justify-between border-t border-white/10 bg-black/10 px-4 py-2 text-[10px] font-semibold text-white/90">
                <span className={colors.subtext}>Shipment: {alert.trackingNumber}</span>
                <span className="text-[9px] opacity-75">Click to view in CS Support Hub &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>

      <Sidebar />
      <main className="relative flex-1 min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-slate-50 flex flex-col">
        <Outlet />
      </main>

      {/* Slide in animation css */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(110%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
