import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../../app/store";
import api from "../../api/axios";
import { UpdatePasswordModal } from "../modals/UpdatePasswordModal";
import {
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Shield,
  Key,
  DollarSign,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountantEmployee {
  _id: string;
  userName: string;
  email: string;
  role: "FINANCE_MANAGER" | "ACCOUNTANT";
  isActive: boolean;
  unreconciledCash: number;
  phone?: string;
}

interface SettlementSummary {
  totalExpected: number;
  totalCollected: number;
  discrepancy: number;
  reconciledDriversCount: number;
}

function formatEgp(amount: number) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Finance Manager Workspace ─────────────────────────────────────────────────

export const FinanceManagerWorkspace: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [employees, setEmployees] = useState<AccountantEmployee[]>([]);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const loadData = async () => {
    if (!user?.companyId || !user?.departmentId) return;
    setLoading(true);
    try {
      const [empRes, summaryRes] = await Promise.all([
        api.get(`/departments/${user.departmentId}/employees`),
        api.get("/settlements/summary"),
      ]);
      if (empRes.data.success) setEmployees(empRes.data.data);
      if (summaryRes.data.success) setSummary(summaryRes.data.data);
    } catch (err: any) {
      showStatus("error", err?.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.departmentId]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showStatus = (type: "success" | "error", message: string) => {
    setActionStatus({ type, message });
    setTimeout(() => setActionStatus(null), 4000);
  };

  // Toggle employee active / inactive status
  const handleToggleStatus = async (emp: AccountantEmployee) => {
    try {
      await api.patch(
        `/departments/${user?.departmentId}/employees/${emp._id}/status`,
        { isActive: !emp.isActive }
      );
      showStatus("success", `${emp.userName} is now ${!emp.isActive ? "active" : "inactive"}`);
      void loadData();
    } catch (err: any) {
      showStatus("error", err?.response?.data?.message || "Failed to update status");
    }
  };

  // Change employee role between FINANCE_MANAGER and ACCOUNTANT
  const handleChangeRole = async (emp: AccountantEmployee) => {
    const newRole =
      emp.role === "ACCOUNTANT" ? "FINANCE_MANAGER" : "ACCOUNTANT";
    try {
      await api.patch(
        `/departments/${user?.departmentId}/employees/${emp._id}/role`,
        { role: newRole }
      );
      showStatus("success", `${emp.userName}'s role changed to ${newRole.replace("_", " ")}`);
      void loadData();
    } catch (err: any) {
      showStatus("error", err?.response?.data?.message || "Failed to update role");
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const activeCount = employees.filter((e) => e.isActive).length;
  const accountants = employees.filter((e) => e.role === "ACCOUNTANT");
  const collectedPct =
    summary && summary.totalExpected > 0
      ? Math.min(100, Math.round((summary.totalCollected / summary.totalExpected) * 100))
      : 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-600">
              Finance Department
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Finance Manager Workspace
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your team, review settlements and track department performance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Change own password */}
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Key className="h-4 w-4" />
              Change Password
            </button>
            {/* Go to full department page */}
            {user?.departmentId && (
              <Link
                to={`/departments/${user.departmentId}`}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                <ExternalLink className="h-4 w-4" />
                Full Department View
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Action status toast */}
      {actionStatus && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            actionStatus.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {actionStatus.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {actionStatus.message}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Team Members",
            value: employees.length,
            sub: `${activeCount} active`,
            icon: <Users className="h-5 w-5 text-white" />,
            bg: "bg-sky-500",
          },
          {
            label: "Accountants",
            value: accountants.length,
            sub: "In this department",
            icon: <Shield className="h-5 w-5 text-white" />,
            bg: "bg-violet-500",
          },
          {
            label: "Expected Today",
            value: summary ? formatEgp(summary.totalExpected) : "—",
            sub: "Total COD expected",
            icon: <DollarSign className="h-5 w-5 text-white" />,
            bg: "bg-amber-500",
          },
          {
            label: "Collected",
            value: summary ? formatEgp(summary.totalCollected) : "—",
            sub: `${summary?.reconciledDriversCount ?? 0} drivers reconciled`,
            icon: <TrendingUp className="h-5 w-5 text-white" />,
            bg: "bg-emerald-500",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-xl ${card.bg}`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.bg}`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* EOD Settlement Progress */}
      {summary && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Finance Overview · Today
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">EOD Reconciliation Status</h2>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {summary.reconciledDriversCount} driver{summary.reconciledDriversCount !== 1 ? "s" : ""} settled
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
            <span>Collection Progress</span>
            <span>{collectedPct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                summary.discrepancy < 0 ? "bg-red-400" : "bg-emerald-500"
              }`}
              style={{ width: `${collectedPct}%` }}
            />
          </div>

          {/* Figures */}
          <div className="mt-5 grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Expected", value: formatEgp(summary.totalExpected), color: "text-slate-900" },
              { label: "Collected", value: formatEgp(summary.totalCollected), color: "text-emerald-700" },
              {
                label: summary.discrepancy < 0 ? "Shortfall" : summary.discrepancy > 0 ? "Overage" : "Balanced",
                value: `${summary.discrepancy < 0 ? "-" : summary.discrepancy > 0 ? "+" : ""}${formatEgp(Math.abs(summary.discrepancy))}`,
                color: summary.discrepancy < 0 ? "text-red-600" : summary.discrepancy > 0 ? "text-amber-600" : "text-emerald-600",
              },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <p className={`mt-1 text-lg font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Quick link to full reconciliation page */}
          <div className="mt-4 text-right">
            <Link
              to="/settlements/reconcile"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Open Full Reconciliation Page →
            </Link>
          </div>
        </div>
      )}

      {/* Accountant Management Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Finance Team</p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900">Team Directory</h2>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading employees…</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No employees in this department yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left">Employee</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp._id} className="group hover:bg-slate-50 transition">
                    {/* Name + email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                          {emp.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{emp.userName}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          emp.role === "FINANCE_MANAGER"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {emp.role === "FINANCE_MANAGER" ? "Finance Manager" : "Accountant"}
                      </span>
                    </td>

                    {/* Active/Inactive */}
                    <td className="px-6 py-4">
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                          <XCircle className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle active status */}
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          title={emp.isActive ? "Deactivate" : "Activate"}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            emp.isActive
                              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                        >
                          {emp.isActive ? "Deactivate" : "Activate"}
                        </button>

                        {/* Promote / Demote */}
                        <button
                          onClick={() => handleChangeRole(emp)}
                          title={`Change to ${emp.role === "ACCOUNTANT" ? "Finance Manager" : "Accountant"}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                          {emp.role === "ACCOUNTANT" ? "Promote" : "Demote"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Update Password Modal */}
      <UpdatePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
};
