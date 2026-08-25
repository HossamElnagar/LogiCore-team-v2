import React from "react";
import { ShieldCheck, Clock, Radio, CheckCircle2, AlertCircle } from "lucide-react";
import type { IncidentStatus } from "../../../types/incident.types";

interface Props {
  status?: IncidentStatus | string;
  className?: string;
  variant?: "default" | "pill" | "dark";
}

export const IncidentStatusBadge: React.FC<Props> = ({ status = "OPEN", className = "", variant = "default" }) => {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case "RESOLVED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
            variant === "dark"
              ? "border border-emerald-500/40 bg-emerald-950/80 text-emerald-300 shadow-sm shadow-emerald-900/30"
              : "border border-emerald-300 bg-emerald-50 text-emerald-700 shadow-xs"
          } ${className}`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          Resolved
        </span>
      );
    case "CLOSED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
            variant === "dark"
              ? "border border-slate-700 bg-slate-800 text-slate-300"
              : "border border-slate-300 bg-slate-100 text-slate-600"
          } ${className}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          Closed
        </span>
      );
    case "IN_PROGRESS":
    case "EN_ROUTE":
    case "ESCALATED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide uppercase transition-all ${
            variant === "dark"
              ? "border border-rose-500/50 bg-gradient-to-r from-rose-950 via-rose-900/80 to-amber-950 text-rose-200 shadow-sm shadow-rose-950/50 animate-pulse"
              : "border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 shadow-xs"
          } ${className}`}
        >
          <Radio className="h-3.5 w-3.5 text-rose-500 shrink-0 animate-pulse" />
          Escalated
        </span>
      );
    case "OPEN":
    case "PENDING":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
            variant === "dark"
              ? "border border-sky-500/40 bg-sky-950/80 text-sky-300 shadow-sm"
              : "border border-sky-300 bg-sky-50 text-sky-700 shadow-xs"
          } ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          In CS Review
        </span>
      );
  }
};

export default IncidentStatusBadge;
