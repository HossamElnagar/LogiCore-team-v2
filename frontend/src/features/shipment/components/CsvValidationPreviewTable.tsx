import React from "react";
import type { CsvStagedBatchResponse, StagedCsvRow } from "../shipment.types";

interface CsvValidationPreviewTableProps {
  batch: CsvStagedBatchResponse;
  onReset: () => void;
  onConfirmForward: () => void;
}

export const CsvValidationPreviewTable: React.FC<CsvValidationPreviewTableProps> = ({
  batch,
  onReset,
  onConfirmForward,
}) => {
  const hasErrors = batch.summary.invalidCount > 0;

  return (
    <div className="mt-6 space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header & Maker-Checker Warning Banner */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            Staging Preview: {batch.batchId}
          </span>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">
            CSV Import Validation & Audit
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            Review row-level validation against drivers, vehicles, and hub records before submitting to Finance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Discard & Re-upload
          </button>
          <button
            type="button"
            onClick={onConfirmForward}
            disabled={hasErrors}
            className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
              hasErrors
                ? "cursor-not-allowed bg-slate-300 text-slate-500"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
            }`}
          >
            Forward to Finance Manager
          </button>
        </div>
      </div>

      {/* Strict Maker-Checker Rule Notice */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-800">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-xs">
            ℹ
          </div>
          <div>
            <span className="font-semibold text-blue-900">Maker–Checker Control Enforced: </span>
            As an Accountant, you cannot publish shipments to live operations directly. Upon confirming a valid batch, it remains in <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-xs font-bold text-blue-900">PENDING_FINANCE_APPROVAL</span> state until the Finance Manager verifies and authorizes atomic system-wide publishing.
          </div>
        </div>
      </div>

      {/* Batch Summary Counters */}
      <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-4 text-center">
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Rows</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{batch.summary.totalRows}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Valid Rows</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{batch.summary.validCount}</p>
        </div>
        <div className={`rounded-2xl p-4 border ${batch.summary.invalidCount > 0 ? "bg-red-50 border-red-200/60" : "bg-slate-50 border-slate-200/60"}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${batch.summary.invalidCount > 0 ? "text-red-600" : "text-slate-500"}`}>
            Invalid Rows
          </p>
          <p className={`mt-1 text-2xl font-bold ${batch.summary.invalidCount > 0 ? "text-red-700" : "text-slate-700"}`}>
            {batch.summary.invalidCount}
          </p>
        </div>
      </div>

      {/* Validation Error Banner if Errors Exist */}
      {hasErrors && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>
            <strong>Validation Blocked:</strong> {batch.summary.invalidCount} rows failed business verification (e.g. invalid driver phone, vehicle plate, hub code, or duplicate tracking). Please fix your CSV and re-upload.
          </span>
        </div>
      )}

      {/* Detailed Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-center">Row</th>
              <th className="px-4 py-3">Shipment Code</th>
              <th className="px-4 py-3">Customer & Destination</th>
              <th className="px-4 py-3">Driver & Vehicle</th>
              <th className="px-4 py-3">Hub & Weight</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3">Validation Findings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {batch.rows.map((row: StagedCsvRow) => (
              <tr key={`staged-row-${row.rowNumber}`} className={!row.isValid ? "bg-red-50/40 hover:bg-red-50/80 transition" : "hover:bg-slate-50/50 transition"}>
                <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-500">#{row.rowNumber}</td>
                <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{row.shipmentCode}</td>
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-slate-900">{row.customerName}</div>
                  <div className="text-xs text-slate-500">{row.destinationCity || "N/A"}</div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-slate-800">Phone: {row.driverPhone || "—"}</div>
                  <div className="text-xs font-mono text-slate-500">Plate: {row.vehiclePlate || "—"}</div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="font-mono font-semibold text-slate-800">{row.originHubCode || "—"}</div>
                  <div className="text-xs text-slate-500">{row.cargoWeightKg ? `${row.cargoWeightKg} kg` : "—"}</div>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {row.isValid ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 border border-red-200">
                      Error
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-xs">
                  {row.isValid ? (
                    <span className="text-emerald-600 font-semibold">Ready for Finance review</span>
                  ) : (
                    <ul className="list-disc space-y-1 pl-4 text-red-600 font-medium">
                      {(row.errors || []).map((err, idx) => (
                        <li key={`err-${idx}`}>{err}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
