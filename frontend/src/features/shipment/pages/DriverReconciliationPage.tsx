import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../../../api/axios";
import type { RootState } from "../../../app/store";

interface Driver {
  _id: string;
  userName: string;
  email: string;
  role: string;
  unreconciledCash: number;
  phone?: string;
}

interface CashSummary {
  totalExpected: number;
  totalCollected: number;
  discrepancy: number;
  reconciledDriversCount: number;
}

export default function DriverReconciliationPage() {
  const { user } = useSelector((state: RootState) => state.auth);

  // States
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [summary, setSummary] = useState<CashSummary>({
    totalExpected: 0,
    totalCollected: 0,
    discrepancy: 0,
    reconciledDriversCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Settle Modal State
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [collectedCash, setCollectedCash] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // UI Feedback
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      // Fetch users and summary in parallel
      const [usersRes, summaryRes] = await Promise.all([
        api.get(`/users/company/${user.companyId}`),
        api.get("/settlements/summary"),
      ]);

      if (usersRes.data.success) {
        // Filter only drivers with pending cash balance
        const pendingDrivers = (usersRes.data.data || []).filter(
          (u: any) => u.role === "DRIVER" && u.unreconciledCash > 0
        );
        setDrivers(pendingDrivers);
      }

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
    } catch (err: any) {
      showNotification("error", err?.response?.data?.message || "Failed to load reconciliation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [user]);

  const handleOpenSettleModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setCollectedCash(String(driver.unreconciledCash));
    setNotes("");
  };

  const handleCloseSettleModal = () => {
    setSelectedDriver(null);
    setCollectedCash("");
    setNotes("");
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    setSubmitting(true);
    try {
      const response = await api.post("/settlements/reconcile", {
        driverId: selectedDriver._id,
        collectedCash: Number(collectedCash),
        notes,
      });

      if (response.data.success) {
        showNotification("success", `Successfully reconciled account for ${selectedDriver.userName}`);
        handleCloseSettleModal();
        void fetchData(); // Reload dashboard and data tables
      }
    } catch (err: any) {
      showNotification("error", err?.response?.data?.message || "Failed to submit reconciliation");
    } finally {
      setSubmitting(false);
    }
  };

  const formatEGP = (val: number) => {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {notification && (
        <div
          role="alert"
          className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl transition-all duration-300 transform translate-y-0 ${
            notification.type === "success"
              ? "border-emerald-500 bg-emerald-950/90 text-emerald-300 backdrop-blur-md"
              : "border-rose-500 bg-rose-950/90 text-rose-300 backdrop-blur-md"
          }`}
        >
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header section with glassmorphism */}
        <header className="rounded-2xl border border-slate-800 bg-slate-950/40 p-8 shadow-2xl backdrop-blur-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-400">
            Financial operations
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            EOD Driver Reconciliation
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Audit daily floating Cash on Delivery balances, log physical cash drops, and reconcile driver wallets.
          </p>
        </header>

        {/* Summary Dashboard Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expected Cash Today</span>
            <p className="mt-2 text-3xl font-black text-white">{formatEGP(summary.totalExpected)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collected Cash Today</span>
            <p className="mt-2 text-3xl font-black text-emerald-400">{formatEGP(summary.totalCollected)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Discrepancy</span>
            <p className={`mt-2 text-3xl font-black ${summary.discrepancy < 0 ? "text-rose-400" : summary.discrepancy > 0 ? "text-amber-400" : "text-slate-300"}`}>
              {summary.discrepancy > 0 ? "+" : ""}
              {formatEGP(summary.discrepancy)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reconciled Drivers</span>
            <p className="mt-2 text-3xl font-black text-white">{summary.reconciledDriversCount} drivers</p>
          </div>
        </div>

        {/* Pending Drivers Data Table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/20 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white">Pending Settlements</h2>
            <button 
              onClick={() => void fetchData()}
              disabled={loading}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh Ledger"}
            </button>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center text-slate-400">
              <span className="animate-pulse">Loading pending driver statements...</span>
            </div>
          ) : drivers.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4 text-right">Floating Cash Float</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-sm">
                  {drivers.map((drv) => (
                    <tr key={drv._id} className="hover:bg-slate-900/40 transition">
                      <td className="py-4 px-4 font-semibold text-slate-200">{drv.userName}</td>
                      <td className="py-4 px-4 text-slate-400">{drv.email}</td>
                      <td className="py-4 px-4 text-slate-400">{drv.phone || "N/A"}</td>
                      <td className="py-4 px-4 text-right font-bold text-amber-400">{formatEGP(drv.unreconciledCash)}</td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenSettleModal(drv)}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] transition"
                        >
                          Approve Settlement
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-slate-500">
              <p className="text-sm font-semibold text-slate-400">All drivers reconciled!</p>
              <p className="text-xs">There are no drivers currently holding unreconciled cash floats.</p>
            </div>
          )}
        </section>
      </div>

      {/* Settle Modal Backdrop */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl transition-all">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Verify Physical Drop</span>
                <h3 className="text-lg font-bold text-white mt-1">Settle {selectedDriver.userName}</h3>
              </div>
              <button 
                onClick={handleCloseSettleModal}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Expected Cash Float</label>
                <div className="w-full rounded-lg bg-slate-950 px-4 py-3 text-lg font-black text-amber-400 border border-slate-850">
                  {formatEGP(selectedDriver.unreconciledCash)}
                </div>
              </div>

              <div>
                <label htmlFor="collected-cash" className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Actual Physical Cash Received
                </label>
                <input
                  id="collected-cash"
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={collectedCash}
                  onChange={(e) => setCollectedCash(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition"
                  placeholder="Enter physical cash amount"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Adjustment Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition"
                  placeholder="Note reasons for discrepancy (if any)..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseSettleModal}
                  className="w-1/2 rounded-lg bg-slate-800 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? "Settling..." : "Confirm & Settle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
