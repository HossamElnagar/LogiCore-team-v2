const fs = require('fs');
const path = require('path');

const accountantPath = path.join(__dirname, 'AccountantWorkspace.tsx');
let content = fs.readFileSync(accountantPath, 'utf8');

// 1. Add imports
content = content.replace(
  'import { importShipments } from "../../features/shipment/shipmentSlice";',
  \`import { stageCsvImport, getBatchDetailsForAccountant } from "../../features/shipment/shipmentSlice";
import { CsvValidationPreviewTable } from "./CsvValidationPreviewTable";\`
);

// 2. Add state variables to the component
content = content.replace(
  'const [stagedRows, setStagedRows] = useState<any[]>([]);',
  \`const [rawCsvText, setRawCsvText] = useState<string>("");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [stagedShipments, setStagedShipments] = useState<any[]>([]);\`
);

// 3. Update handleFileUpload
content = content.replace(
  /const handleFileUpload =.*?reader\.readAsText\(file\);\s*};/s,
  \`const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | undefined;
    if ('dataTransfer' in event) file = event.dataTransfer.files?.[0];
    else file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawCsvText(text);
      setStatus("CSV file selected. Ready to stage.");
    };
    reader.onerror = () => setStatus("Failed to read CSV file");
    reader.readAsText(file);
  };\`
);

// 4. Replace uploadToServer
content = content.replace(
  /const uploadToServer = async \(\) => \{.*?\};\s*const approveSettlement/s,
  \`const uploadToServer = async () => {
    if (!rawCsvText) return;
    setIsUploading(true);
    setStatus("Staging CSV import...");
    
    try {
      const resultAction = await dispatch(stageCsvImport(rawCsvText));
      
      if (stageCsvImport.fulfilled.match(resultAction)) {
        const payload = resultAction.payload as any;
        if (payload.success && payload.data.batchId) {
           setStatus("CSV staged successfully. Loading preview...");
           
           // Now load the details
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
           setStatus(\`Error: \${payload.message}\`);
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
  
  const approveSettlement\`
);

// 5. Replace the "Submit Batch" button area
content = content.replace(
  /<button\s+onClick=\{uploadToServer\}\s+disabled=\{stagedRows\.length === 0 \|\| isUploading\}.*?<\/button>/s,
  \`<button
    onClick={uploadToServer}
    disabled={!rawCsvText || isUploading}
    className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
  >
    {isUploading ? "Staging..." : "Stage CSV"}
  </button>\`
);

// 6. Mount the new Preview table
content = content.replace(
  /\{stagedRows\.length > 0 && \([\s\S]*?\}\)\}\s*<\/tbody>\s*<\/table>\s*<\/div>\s*\)\}/s,
  \`{activeBatchId ? (
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
  )}\`
);

fs.writeFileSync(accountantPath, content, 'utf8');
console.log("AccountantWorkspace.tsx updated successfully!");
