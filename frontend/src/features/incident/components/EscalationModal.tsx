import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  X,
  Search,
  Phone,
  Building2,
  MapPin,
  Radio,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { incidentService } from "../incident.service";
import type { Incident, BranchManager } from "../../../types/incident.types";
import { UserRole } from "../../../types/user.types";
import type { RootState } from "../../../app/store";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
  onSuccess?: (updatedData?: Record<string, unknown>) => void;
}

export const EscalationModal: React.FC<Props> = ({ isOpen, onClose, incident, onSuccess }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [managers, setManagers] = useState<BranchManager[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedManagers, setSelectedManagers] = useState<BranchManager[]>([]);
  const [issueTitle, setIssueTitle] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user?.companyId) return;

    if (incident) {
      setIssueTitle(`EMERGENCY ESCALATION: ${incident.title}`);
    }

    const loadManagers = async () => {
      setLoading(true);
      setError(null);
      try {
        const users = await incidentService.getCompanyUsers(user.companyId!);
        // Filter for executive & management roles
        const mgrs = users.filter((u) => {
          const role = String(typeof u.role === "string" ? u.role : u.role ?? "").toUpperCase();
          return [UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER, UserRole.OWNER].includes(role as UserRole);
        });
        setManagers(mgrs);
        if (mgrs.length > 0 && selectedManagers.length === 0) {
          setSelectedManagers([mgrs[0]]);
        }
      } catch (err: any) {
        setError("Failed to load branch managers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    void loadManagers();
  }, [isOpen, user?.companyId, incident]);

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || selectedManagers.length === 0) return;

    setEscalating(true);
    setError(null);
    try {
      const result = await incidentService.escalateToManager(
        incident._id,
        selectedManagers.map((manager) => manager._id),
        issueTitle || `Escalated Incident: ${incident.title}`
      );
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to transfer incident to manager.");
    } finally {
      setEscalating(false);
    }
  };

  const filteredManagers = managers.filter((m) => {
    const term = search.toLowerCase();
    return (
      (m.userName && m.userName.toLowerCase().includes(term)) ||
      (m.email && m.email.toLowerCase().includes(term)) ||
      (m.role && m.role.toString().toLowerCase().includes(term)) ||
      (m.branchName && m.branchName.toLowerCase().includes(term))
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-rose-500/30 bg-slate-900 shadow-2xl shadow-rose-950/50 text-slate-100"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 p-6 border-b border-rose-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30">
                  <ShieldAlert className="h-6 w-6 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white">
                    Escalate Incident to Manager
                  </h2>
                  <p className="text-xs text-rose-200 opacity-90">
                    Summon executive supervisor to join active 3-way incident chat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleEscalate} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-500/50 bg-rose-950/60 p-3.5 text-xs font-bold text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Escalation Title Override */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Escalation Alert Subject
              </label>
              <input
                type="text"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                required
                placeholder="e.g. CRITICAL: Highway accident requiring legal & insurance dispatch"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition"
              />
            </div>

            {/* Manager Selector Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Select Branch Supervisor ({filteredManagers.length})
                </label>
                <div className="relative w-48">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter managers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/50 gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
                  <p className="text-xs font-bold text-slate-400">Loading branch supervisors...</p>
                </div>
              ) : filteredManagers.length > 0 ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {filteredManagers.map((m) => {
                    const isSelected = selectedManagers.some((selected) => selected._id === m._id);
                    const branchName = m.branchName || (typeof m.departmentId === "object" && m.departmentId?.name) || "Main HQ Dispatch";
                    const location = m.branchLocation || (typeof m.departmentId === "object" && m.departmentId?.location) || "Cairo Regional Terminal";
                    const isOnline = m.isOnline !== undefined ? m.isOnline : true; // visual default if undefined

                    return (
                      <div
                        key={m._id}
                        onClick={() => {
                          setSelectedManagers((current) => {
                            const alreadySelected = current.some((selected) => selected._id === m._id);
                            return alreadySelected
                              ? current.filter((selected) => selected._id !== m._id)
                              : [...current, m];
                          });
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${isSelected
                            ? "border-rose-500/80 bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 shadow-md ring-2 ring-rose-500/20"
                            : "border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 hover:border-slate-700"
                          }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 font-extrabold text-white text-sm shadow-inner">
                            {m.userName?.slice(0, 2).toUpperCase() || "MGR"}
                            <span
                              className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-900 ${isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500" : "bg-slate-600"
                                }`}
                              title={isOnline ? "Online Now" : "Offline / Standby"}
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-white truncate">{m.userName}</h4>
                              <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                                {m.role.toString().replace("_", " ")}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-emerald-400" /> {branchName}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-amber-400" /> {location}
                              </span>
                              {m.phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="h-3 w-3 text-sky-400" /> {m.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          {isSelected && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg">
                              <CheckCircle className="h-4 w-4 stroke-[2.5]" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                  No branch managers matching your criteria were found.
                </div>
              )}
            </div>

            {/* Summary Alert Box */}
            {selectedManagers.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-4 text-xs text-amber-300">
                <p className="font-extrabold flex items-center gap-1.5 text-amber-400">
                  <Radio className="h-3.5 w-3.5 animate-pulse text-amber-400" /> Live Socket Handover Protocol
                </p>
                <p className="mt-1 opacity-90 leading-relaxed">
                  Escalating will transfer incident <strong className="text-white">#{incident?._id.slice(-6)}</strong> status to{" "}
                  <span className="font-bold underline">IN_PROGRESS (ESCALATED)</span>, automatically inject{" "}
                  <strong className="text-white">
                    {selectedManagers.map((m) => m.userName).join(", ")}
                  </strong>                </p>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl px-5 py-3 text-xs font-extrabold text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={escalating || selectedManagers.length === 0}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-rose-600/30 hover:scale-[1.02] active:scale-98 transition-transform disabled:opacity-50"
              >
                {escalating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Summoning Manager...
                  </>
                ) : (
                  <>
                    <span>Confirm Emergency Transfer</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EscalationModal;
