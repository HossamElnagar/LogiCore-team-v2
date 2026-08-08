import React, { useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../app/store";
import {
  submitBatchForApproval,
  cancelBatch
} from "../../features/shipment/shipmentSlice";

interface Props {
  batchId: string;
  shipments: any[];
  onClear: () => void;
}

export const CsvValidationPreviewTable: React.FC<Props> = ({ batchId, shipments, onClear }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [status, setStatus] = useState<string | null>(null);

  const hasErrors = shipments.some(s => s.validationErrors && s.validationErrors.length > 0);

  const handleSubmit = async () => {
    setStatus("Submitting...");
    try {
      await dispatch(submitBatchForApproval(batchId)).unwrap();
      setStatus("Batch submitted to Finance successfully!");
      setTimeout(onClear, 2000);
    } catch (err: any) {
      setStatus(err.message || "Failed to submit batch");
    }
  };

  const handleCancel = async () => {
    setStatus("Cancelling...");
    try {
      await dispatch(cancelBatch(batchId)).unwrap();
      setStatus("Batch cancelled.");
      setTimeout(onClear, 2000);
    } catch (err: any) {
      setStatus(err.message || "Failed to cancel batch");
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-4">Preview & Validate (Batch {batchId})</h2>
      {status && <p className="mb-4 font-semibold text-blue-600">{status}</p>}
      
      <div className="flex gap-4 mb-4">
        <button 
          onClick={handleSubmit} 
          disabled={hasErrors}
          className={`px-4 py-2 rounded-lg text-white ${hasErrors ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          Submit to Finance
        </button>
        <button 
          onClick={handleCancel}
          className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
        >
          Cancel Batch
        </button>
      </div>
      
      {hasErrors && (
        <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-lg">
          Warning: There are validation errors. You must resolve them before submitting.
        </div>
      )}

      <div className="max-h-96 overflow-auto border rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Tracking</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Errors</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s, idx) => (
              <tr key={idx} className={`border-b ${s.validationErrors?.length ? 'bg-rose-50' : ''}`}>
                <td className="p-3 font-mono">{s.trackingNumber}</td>
                <td className="p-3">{s.customerName}</td>
                <td className="p-3 text-rose-600">
                  {s.validationErrors?.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
