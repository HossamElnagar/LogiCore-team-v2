import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../app/store";
import {
  listPendingBatches,
  getBatchDetailsForFinance,
  approveBatch,
  rejectBatch
} from "../../features/shipment/shipmentSlice";

export const FinanceBatchReviewSection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const fetchBatches = async () => {
    try {
      const res = await dispatch(listPendingBatches()).unwrap();
      if (res.success) setBatches(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [dispatch]);

  const handleSelect = async (batchId: string) => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await dispatch(getBatchDetailsForFinance(batchId)).unwrap();
      if (res.success) setSelectedBatch(res.data);
    } catch (err: any) {
      setStatus(err.message || "Failed to load batch");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedBatch) return;
    setStatus("Approving...");
    try {
      await dispatch(approveBatch(selectedBatch.batchId)).unwrap();
      setStatus("Batch approved successfully.");
      setSelectedBatch(null);
      fetchBatches();
    } catch (err: any) {
      setStatus(err.message || "Approval failed.");
    }
  };

  const handleReject = async () => {
    if (!selectedBatch) return;
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    setStatus("Rejecting...");
    try {
      await dispatch(rejectBatch({ batchId: selectedBatch.batchId, reason })).unwrap();
      setStatus("Batch rejected successfully.");
      setSelectedBatch(null);
      fetchBatches();
    } catch (err: any) {
      setStatus(err.message || "Rejection failed.");
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-4">Pending CSV Batches</h2>
      {status && <p className="mb-4 text-blue-600">{status}</p>}
      
      <div className="flex gap-6">
        <div className="w-1/3 border-r pr-6">
          {batches.length === 0 ? <p>No pending batches.</p> : (
            <ul>
              {batches.map(b => (
                <li key={b._id} className="mb-2">
                  <button 
                    onClick={() => handleSelect(b._id)}
                    className="text-left w-full p-3 rounded-lg border hover:bg-slate-50 transition"
                  >
                    <div className="font-semibold text-sm">Batch: {b._id}</div>
                    <div className="text-xs text-slate-500">Rows: {b.count}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="w-2/3">
          {loading && <p>Loading batch details...</p>}
          {!loading && selectedBatch && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Review Batch {selectedBatch.batchId}</h3>
              <div className="flex gap-3 mb-6">
                <button onClick={handleApprove} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Approve</button>
                <button onClick={handleReject} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">Reject</button>
              </div>
              
              <div className="max-h-96 overflow-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-3">Tracking</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">COD</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBatch.shipments.map((s: any) => (
                      <tr key={s._id} className="border-b">
                        <td className="p-3 font-mono">{s.trackingNumber}</td>
                        <td className="p-3">{s.customerName}</td>
                        <td className="p-3">{s.codAmount}</td>
                        <td className="p-3">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
