export interface ParsedCsvRow {
  rowNumber: number; // 1-indexed relative to data rows
  shipment_code: string;
  driver_phone: string;
  vehicle_plate: string;
  origin_hub_code: string;
  destination_city: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | undefined;
  customer_address: string;
  cargo_weight_kg: number;
  raw_cargo_weight: string;
  cod_amount: number;
  estimated_delivery?: string | undefined;
  notes?: string | undefined;
  rawLine?: string | undefined;
}

/**
 * Parses a single CSV line, respecting double-quoted fields that may contain commas.
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        // Escaped quote inside quoted string
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses raw CSV content string into structured shipment row objects.
 * Expects canonical header names or reasonable fallbacks.
 */
export function parseShipmentCsv(content: string): ParsedCsvRow[] {
  if (!content || typeof content !== "string") {
    return [];
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return []; // No data rows found
  }

  const headerCells = parseCsvLine(lines[0] || "").map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ""));

  const getIdx = (...keys: string[]) =>
    headerCells.findIndex((header) => keys.some((k) => header === k || header.includes(k)));

  const codeIdx = getIdx("shipment_code", "tracking_number", "code", "tracking");
  const driverPhoneIdx = getIdx("driver_phone", "driver_mobile", "driver_contact");
  const vehiclePlateIdx = getIdx("vehicle_plate", "plate", "vehicle");
  const hubIdx = getIdx("origin_hub_code", "hub_code", "hub", "origin_hub");
  const destCityIdx = getIdx("destination_city", "city", "destination");
  const custNameIdx = getIdx("customer_name", "customer", "recipient_name");
  const custPhoneIdx = getIdx("customer_phone", "recipient_phone", "recipient_mobile");
  const custEmailIdx = getIdx("customer_email", "email", "recipient_email");
  const custAddrIdx = getIdx("customer_address", "address", "delivery_address");
  const weightIdx = getIdx("cargo_weight_kg", "weight_kg", "weight", "cargo_weight");
  const codIdx = getIdx("cod_amount", "cod", "cash_on_delivery");
  const estDateIdx = getIdx("estimated_delivery", "delivery_date", "est_delivery");
  const notesIdx = getIdx("notes", "comment", "remarks");

  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i] || "";
    const cells = parseCsvLine(rawLine);

    // If row is entirely empty or shorter than minimum required columns, skip or stage as invalid
    if (cells.every((c) => c === "")) continue;

    const hasAnyHeader = codeIdx !== -1 || custNameIdx !== -1 || driverPhoneIdx !== -1 || weightIdx !== -1;
    const getVal = (idx: number, fallbackIdx: number): string => {
      if (idx !== -1 && idx < cells.length) return cells[idx] || "";
      if (!hasAnyHeader && fallbackIdx >= 0 && fallbackIdx < cells.length) return cells[fallbackIdx] || "";
      return "";
    };

    const raw_cargo_weight = getVal(weightIdx, 9);
    const parsedWeight = parseFloat(raw_cargo_weight);
    const raw_cod = getVal(codIdx, -1);
    const parsedCod = parseFloat(raw_cod);

    rows.push({
      rowNumber: i,
      shipment_code: getVal(codeIdx, 0),
      driver_phone: getVal(driverPhoneIdx, 1),
      vehicle_plate: getVal(vehiclePlateIdx, 2),
      origin_hub_code: getVal(hubIdx, 3),
      destination_city: getVal(destCityIdx, 4),
      customer_name: getVal(custNameIdx, 5),
      customer_phone: getVal(custPhoneIdx, 6),
      customer_email: getVal(custEmailIdx, 7) || undefined,
      customer_address: getVal(custAddrIdx, 8),
      cargo_weight_kg: isNaN(parsedWeight) ? -1 : parsedWeight,
      raw_cargo_weight,
      cod_amount: isNaN(parsedCod) ? 0 : parsedCod,
      estimated_delivery: getVal(estDateIdx, 10) || undefined,
      notes: getVal(notesIdx, 11) || undefined,
      rawLine,
    });
  }

  return rows;
}
