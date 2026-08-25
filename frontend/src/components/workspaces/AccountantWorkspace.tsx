import { useEffect, useMemo, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import api from "../../api/axios";
import type { AppDispatch, RootState } from "../../app/store";
import { useLanguage } from "../../context/LanguageContext";
import { importShipments } from "../../features/shipment/shipmentSlice";

interface DriverRow {
  _id: string;
  userName: string;
  email: string;
  unreconciledCash: number;
  phone?: string;
}

interface SummaryRow {
  totalExpected: number;
  totalCollected: number;
  discrepancy: number;
  reconciledDriversCount: number;
}

function formatEgp(value: number) {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);
}

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  
  // Try to find indices, or fallback to sensible defaults based on header names
  const trackingIdx = headers.findIndex(h => h.includes('tracking'));
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('cod') || h.includes('price'));
  const warehouseIdx = headers.findIndex(h => h.includes('warehouse') || h.includes('pickup'));
  const driverIdx = headers.findIndex(h => h.includes('driver') || h.includes('agent') || h.includes('email'));
  
  // Customer required fields
  const customerNameIdx = headers.findIndex(h => h.includes('customer_name') || h.includes('name'));
  const customerPhoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
  const deliveryAddressIdx = headers.findIndex(h => h.includes('delivery') || h.includes('destination'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV split, doesn't handle commas inside quotes, but fine for MVP
    const cells = lines[i].split(",").map(c => c.trim());
    if (cells.length < 4) continue;
    
    rows.push({
      trackingNumber: trackingIdx !== -1 ? cells[trackingIdx] : cells[0],
      codAmount: amountIdx !== -1 ? Number(cells[amountIdx]) || 0 : Number(cells[1]) || 0,
      pickupAddress: warehouseIdx !== -1 ? cells[warehouseIdx] : cells[2],
      driverEmail: driverIdx !== -1 ? cells[driverIdx] : cells[3],
      // Required fields, providing generic fallbacks if columns are completely missing
      customerName: customerNameIdx !== -1 && cells[customerNameIdx] ? cells[customerNameIdx] : "Unknown Customer",
      customerPhone: customerPhoneIdx !== -1 && cells[customerPhoneIdx] ? cells[customerPhoneIdx].replace(/\D/g, '') || "00000000000" : "00000000000",
      deliveryAddress: deliveryAddressIdx !== -1 && cells[deliveryAddressIdx] ? cells[deliveryAddressIdx] : "Unknown Address",
    });
  }
  return rows;
}

export function AccountantWorkspace() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const { t, dir } = useLanguage();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow>({ totalExpected: 0, totalCollected: 0, discrepancy: 0, reconciledDriversCount: 0 });
  const [stagedRows, setStagedRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    if (!user?.companyId) return;
    try {
      const [usersRes, summaryRes] = await Promise.all([api.get(`/users/company/${user.companyId}`), api.get("/settlements/summary")]);
      if (usersRes.data.success) {
        setDrivers((usersRes.data.data || []).filter((item: any) => item.role === "DRIVER"));
      }
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err?.message || "Failed to load data");
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.companyId]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | undefined;
    if ('dataTransfer' in event) {
      file = event.dataTransfer.files?.[0];
    } else {
      file = event.target.files?.[0];
    }
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setStatus("CSV is empty or invalid format.");
      } else {
        setStagedRows(parsed);
        setStatus(`Staged ${parsed.length} rows from CSV.`);
      }
    };
    reader.onerror = () => {
      setStatus("Failed to read CSV file");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e);
  };

  const uploadToServer = async () => {
    if (stagedRows.length === 0) return;
    setIsUploading(true);
    setStatus("Uploading to server...");
    
    try {
      const resultAction = await dispatch(importShipments({ shipments: stagedRows }));
      
      if (importShipments.fulfilled.match(resultAction)) {
        const payload = resultAction.payload as any;
        if (payload.success) {
           setStatus(payload.message);
           setStagedRows([]); // Clear staged rows on success
           if (fileInputRef.current) fileInputRef.current.value = '';
           void loadData();
        } else {
           setStatus(`Error: ${payload.message}`);
        }
      } else {
         const errorPayload = resultAction.payload as any;
         let errorMessage = "Unknown error occurred";
         
         if (typeof errorPayload === "string") {
            // Strip HTML tags if the server returned an HTML error page
            errorMessage = errorPayload.replace(/<[^>]*>?/gm, '').substring(0, 200);
         } else if (errorPayload?.errors && Array.isArray(errorPayload.errors)) {
            // Handle Joi Validation Errors
            errorMessage = errorPayload.errors.map((e: any) => `${e.field}: ${e.message}`).join(" | ");
         } else if (errorPayload?.message) {
            errorMessage = errorPayload.message;
            if (errorPayload?.data?.failedRows?.length > 0) {
               const reasons = errorPayload.data.failedRows.map((r: any) => `Row ${r.row}: ${r.reason}`).join(", ");
               errorMessage += ` | Details: ${reasons}`;
            }
         } else {
            errorMessage = resultAction.error.message || "Upload rejected";
         }
         
         setStatus(`Error: ${errorMessage}`);
      }
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err?.message || "An error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const approveSettlement = async (driver: DriverRow) => {
    try {
      await api.post("/settlements/reconcile", { driverId: driver._id, collectedCash: driver.unreconciledCash, notes: "Approved from workspace" });
      setStatus(t("statusSuccess"));
      void loadData();
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err?.message || "Failed to approve settlement");
    }
  };

  const deleteStagedRow = (indexToRemove: number) => {
    setStagedRows(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const summaryCards = useMemo(() => [
    { label: "Expected cash", value: formatEgp(summary.totalExpected) },
    { label: "Collected cash", value: formatEgp(summary.totalCollected) },
    { label: "Discrepancy", value: formatEgp(summary.discrepancy) },
  ], [summary]);

  return (
    <div className="space-y-6" dir={dir}>
      <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">{t("accountantWorkspaceTitle")}</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{t("accountantWorkspaceSubtitle")}</h2>
      </header>

      {status ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Daily ledger</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Pending settlements</h3>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.25em] text-slate-500">
                <tr>
                  <th className="pb-3">Driver</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3 text-right">Unreconciled cash</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {drivers.map((driver) => (
                  <tr key={driver._id}>
                    <td className="py-3 font-semibold">{driver.userName}</td>
                    <td className="py-3">{driver.email}</td>
                    <td className="py-3 text-right">{formatEgp(driver.unreconciledCash)}</td>
                    <td className="py-3 text-right flex justify-end gap-2">
                      <button type="button" onClick={() => void approveSettlement(driver)} className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white">{t("approveSettlementButton")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{t("finance.csv_ingest_title") as any}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Warehouse dispatch import</h3>
          </div>

          <div 
            className={`mt-5 flex flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-slate-50'} p-6 text-center hover:bg-slate-100 transition`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={handleFileUpload} 
              className="hidden" 
              id="csv-upload" 
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3 pointer-events-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700 pointer-events-none">{t("finance.drag_drop_text") as any}</p>
              <p className="text-xs text-slate-500 mt-1 pointer-events-none">.csv up to 2MB</p>
            </label>
          </div>

          {stagedRows.length > 0 && (
            <button 
              type="button" 
              onClick={uploadToServer} 
              disabled={isUploading}
              className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-400 disabled:opacity-50 transition"
            >
              {isUploading ? "Uploading..." : "Upload to Server"}
            </button>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.25em] text-slate-500">
                <tr>
                  <th className="pb-3">Tracking</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Warehouse</th>
                  <th className="pb-3">Driver</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stagedRows.slice(0, 10).map((row, index) => (
                  <tr key={`${row.trackingNumber}-${index}`}>
                    <td className="py-2">{row.trackingNumber}</td>
                    <td className="py-2">{row.codAmount}</td>
                    <td className="py-2">{row.pickupAddress}</td>
                    <td className="py-2">{row.driverEmail}</td>
                    <td className="py-2 text-right">
                      <button 
                        type="button" 
                        onClick={() => deleteStagedRow(index)}
                        className="rounded bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 px-2 py-1 text-xs font-semibold transition"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {stagedRows.length > 10 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-xs text-slate-500 italic">
                      ...and {stagedRows.length - 10} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
