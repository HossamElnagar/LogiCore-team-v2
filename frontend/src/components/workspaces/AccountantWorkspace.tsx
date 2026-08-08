import { useEffect, useMemo, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import api from "../../api/axios";
import type { AppDispatch, RootState } from "../../app/store";
import { useLanguage } from "../../context/LanguageContext";
import { stageCsvImport, getBatchDetailsForAccountant } from "../../features/shipment/shipmentSlice";
import { CsvValidationPreviewTable } from "./CsvValidationPreviewTable";

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
  
  const [rawCsvText, setRawCsvText] = useState<string>("");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [stagedShipments, setStagedShipments] = useState<any[]>([]);

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
      file = (event.target as HTMLInputElement).files?.[0];
    }
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawCsvText(text);
      setStatus("CSV file selected. Ready to stage.");
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
    if (!rawCsvText) return;
    setIsUploading(true);
    setStatus("Staging CSV import...");
    
    try {
      const resultAction = await dispatch(stageCsvImport(rawCsvText));
      
      if (stageCsvImport.fulfilled.match(resultAction)) {
        const payload = resultAction.payload as any;
        if (payload.success && payload.data.batchId) {
           setStatus("CSV staged successfully. Loading preview...");
           const detailsRes = await dispatch(getBatchDetailsForAccountant(payload.data.batchId));
           if (getBatchDetailsForAccountant.fulfilled.match(detailsRes)) {
             const detailsPayload = detailsRes.payload as any;
             setActiveBatchId(detailsPayload.data.batchId);
             setStagedShipments(detailsPayload.data.shipments);
             setStatus("");
           } else {
             setStatus("Failed to load batch details.");
           }
        } else {
           setStatus(`Error: ${payload.message}`);
        }
      } else {
         setStatus("Upload rejected");
      }
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err?.message || "An error occurred during staging");
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

          {rawCsvText && (
            <button
              onClick={uploadToServer}
              disabled={!rawCsvText || isUploading}
              className="mt-4 w-full rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {isUploading ? "Staging..." : "Stage CSV"}
            </button>
          )}

        </section>
      </div>

      {/* CSV Preview Table */}
      {activeBatchId ? (
        <CsvValidationPreviewTable 
          batchId={activeBatchId} 
          shipments={stagedShipments} 
          onClear={() => { setActiveBatchId(null); setStagedShipments([]); setRawCsvText(""); }} 
        />
      ) : (
        rawCsvText && !isUploading && (
          <div className="mt-6 p-4 bg-emerald-50 text-emerald-800 rounded-lg">
            CSV File loaded in memory. Click "Stage CSV" to validate on the server.
          </div>
        )
      )}
    </div>
  );
}
