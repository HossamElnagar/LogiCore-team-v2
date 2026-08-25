import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "../../../app/store";
import {
  fetchPendingBatches,
  fetchBatchDetails,
  approveBatch,
  rejectBatch,
  clearSelectedBatchDetails,
} from "../shipmentSlice";
import { CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, Eye, RefreshCw, Layers } from "lucide-react";

export const FinanceBatchReviewSection: React.FC<{ onStatusMessage: (type: "success" | "error", msg: string) => void }> = ({
  onStatusMessage,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { pendingBatches, selectedBatchDetails, loading } = useSelector(
    (state: RootState) => state.shipment || (state as any).shipments
  );

  const [rejectModalBatchId, setRejectModalBatchId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchPendingBatches());
  }, [dispatch]);

  const handleRefresh = () => {
    void dispatch(fetchPendingBatches());
    if (selectedBatchDetails?.summary?.batchId) {
      void dispatch(fetchBatchDetails(selectedBatchDetails.summary.batchId));
    }
  };

  const handleSelectBatch = async (batchId: string) => {
    if (selectedBatchDetails?.summary?.batchId === batchId) {
      dispatch(clearSelectedBatchDetails());
    } else {
      await dispatch(fetchBatchDetails(batchId));
    }
  };

  const handleApprove = async (batchId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm("Are you sure you want to authorize and publish this entire batch atomically to live operations?")) {
      return;
    }

    setProcessingBatchId(batchId);
    const resAction = await dispatch(approveBatch(batchId));
    setProcessingBatchId(null);

    if (approveBatch.fulfilled.match(resAction)) {
      onStatusMessage("success", `✅ Batch ${batchId} approved! Published ${resAction.payload.approvedCount} shipments atomically via Socket.IO.`);
      void dispatch(fetchPendingBatches());
    } else {
      const err = resAction.payload as any;
      onStatusMessage("error", err?.message || resAction.error.message || "Failed to approve batch");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalBatchId) return;
    setProcessingBatchId(rejectModalBatchId);
    const resAction = await dispatch(
      rejectBatch({ batchId: rejectModalBatchId, reason: rejectReason.trim() || "Rejected by Finance Manager review" })
    );
    setProcessingBatchId(null);
    setRejectModalBatchId(null);
    setRejectReason("");

    if (rejectBatch.fulfilled.match(resAction)) {
      onStatusMessage("success", `🚫 Batch ${rejectModalBatchId} has been rejected and returned to Accountant.`);
      void dispatch(fetchPendingBatches());
    } else {
      const err = resAction.payload as any;
      onStatusMessage("error", err?.message || resAction.error.message || "Failed to reject batch");
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800 border border-violet-200">
              Checker Control
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Staged Import Queue</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Maker–Checker Batch Approval</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Review staged shipment imports submitted by Accountants before authorizing system-wide publication.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          Refresh Queue
        </button>
      </div>

      {pendingBatches.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <Layers className="h-10 w-10 text-slate-300 mb-2" />
          <p className="font-semibold text-slate-600">No Pending Import Batches</p>
          <p className="text-xs text-slate-400 mt-0.5">When an Accountant stages a CSV import, it will appear here for audit and authorization.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {pendingBatches.map((batch) => {
            const hasInvalid = batch.invalidCount > 0;
            const isSelected = selectedBatchDetails?.summary?.batchId === batch.batchId;

            return (
              <div
                key={batch.batchId}
                className={`rounded-2xl border transition-all ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/10 shadow-md ring-1 ring-emerald-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                }`}
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5 cursor-pointer flex-1" onClick={() => handleSelectBatch(batch.batchId)}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm border border-slate-200">
                        {batch.batchId}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Submitted by <strong className="text-slate-800">{batch.submittedBy}</strong> on{" "}
                        {new Date(batch.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 pt-1">
                      <div>
                        Total Shipments: <strong className="text-slate-900 font-bold">{batch.totalCount}</strong>
                      </div>
                      <div>
                        Total Cargo: <strong className="text-slate-900 font-bold">{batch.totalCargoWeight} kg</strong>
                      </div>
                      <div>
                        Drivers Referenced: <strong className="text-slate-900 font-bold">{batch.uniqueDriversCount}</strong>
                      </div>
                      <div>
                        Valid Rows: <span className="text-emerald-700 font-bold">{batch.validCount}</span>
                      </div>
                      {batch.invalidCount > 0 && (
                        <div>
                          Invalid Rows: <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded">{batch.invalidCount}</span>
                        </div>
                      )}
                    </div>

                    {batch.errorsSummary && batch.errorsSummary.length > 0 && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-xl border border-red-200/60 font-medium">
                        <span className="font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 inline" /> Validation Warnings ({batch.errorsSummary.length}):
                        </span>
                        <p className="truncate max-w-2xl mt-0.5 text-[11px] text-red-700">{batch.errorsSummary.join(" | ")}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleSelectBatch(batch.batchId)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Eye className="h-4 w-4 text-slate-500" />
                      {isSelected ? "Hide Details" : "Review Rows"}
                    </button>

                    <button
                      disabled={hasInvalid || processingBatchId === batch.batchId}
                      onClick={(e) => handleApprove(batch.batchId, e)}
                      title={hasInvalid ? "Cannot approve batch with invalid rows" : "Authorize and publish batch"}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${
                        hasInvalid
                          ? "cursor-not-allowed bg-slate-300 text-slate-500"
                          : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {processingBatchId === batch.batchId ? "Publishing..." : "Approve & Publish"}
                    </button>

                    <button
                      disabled={processingBatchId === batch.batchId}
                      onClick={() => {
                        setRejectModalBatchId(batch.batchId);
                        setRejectReason("");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>

                {/* Expanded Row Level Audit View */}
                {isSelected && selectedBatchDetails && (
                  <div className="border-t border-slate-200 bg-slate-50/60 p-5 rounded-b-2xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        Shipment Row Matrix ({selectedBatchDetails.shipments.length} records)
                      </h4>
                      <span className="text-xs text-slate-500">Atomic Publishing Required: All items will commit simultaneously on approval.</span>
                    </div>

                    <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-inner">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-100 font-semibold uppercase text-slate-600 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2.5">Tracking #</th>
                            <th className="px-3 py-2.5">Customer</th>
                            <th className="px-3 py-2.5">Driver Phone</th>
                            <th className="px-3 py-2.5">Vehicle Plate</th>
                            <th className="px-3 py-2.5">Hub</th>
                            <th className="px-3 py-2.5 text-right">Weight (kg)</th>
                            <th className="px-3 py-2.5 text-right">COD (EGP)</th>
                            <th className="px-3 py-2.5 text-center">Row Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {selectedBatchDetails.shipments.map((item) => (
                            <tr
                              key={item._id || item.trackingNumber}
                              className={item.isValid === false ? "bg-red-50/60 text-red-900" : "hover:bg-slate-50"}
                            >
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">{item.trackingNumber}</td>
                              <td className="px-3 py-2">{item.customerName}</td>
                              <td className="px-3 py-2">{item.driverPhone || "—"}</td>
                              <td className="px-3 py-2 font-mono">{item.vehiclePlate || "—"}</td>
                              <td className="px-3 py-2 font-mono">{item.originHubCode || "—"}</td>
                              <td className="px-3 py-2 text-right">{item.cargoWeightKg ?? 0}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-900">{item.codAmount ?? 0}</td>
                              <td className="px-3 py-2 text-center">
                                {item.isValid !== false ? (
                                  <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800" title={item.validationErrors?.join(", ")}>
                                    Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalBatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-red-600">
              <XCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">Reject Import Batch</h3>
            </div>
            <p className="text-sm text-slate-600">
              You are about to reject batch <strong className="font-mono text-slate-900">{rejectModalBatchId}</strong>. All staged records will be transitioned to <span className="font-mono text-xs bg-red-50 text-red-700 px-1 py-0.5 rounded font-bold">REJECTED</span> and returned to the Accountant.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Rejection Reason / Feedback for Maker
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Discrepancy in COD sums, incorrect driver phone codes, or duplicate entries detected."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalBatchId(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRejectConfirm()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
