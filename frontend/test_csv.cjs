const fs = require('fs');

function parseCsv(content) {
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
    const cells = lines[i].split(",").map(c => c.trim());
    if (cells.length < 4) continue;
    
    rows.push({
      trackingNumber: trackingIdx !== -1 ? cells[trackingIdx] : cells[0],
      codAmount: amountIdx !== -1 ? Number(cells[amountIdx]) || 0 : Number(cells[1]) || 0,
      pickupAddress: warehouseIdx !== -1 ? cells[warehouseIdx] : cells[2],
      driverEmail: driverIdx !== -1 ? cells[driverIdx] : cells[3],
      customerName: customerNameIdx !== -1 && cells[customerNameIdx] ? cells[customerNameIdx] : "Unknown Customer",
      customerPhone: customerPhoneIdx !== -1 && cells[customerPhoneIdx] ? cells[customerPhoneIdx].replace(/\D/g, '') || "00000000000" : "00000000000",
      deliveryAddress: deliveryAddressIdx !== -1 && cells[deliveryAddressIdx] ? cells[deliveryAddressIdx] : "Unknown Address",
    });
  }
  return rows;
}

const csv = `Tracking,Amount,Warehouse,Driver Email,Customer Name,Phone,Delivery Address
TRK12345,150,Main Warehouse,driver@company.com,John Doe,01012345678,123 Delivery St
TRK12346,250,Main Warehouse,driver@company.com,Jane Doe,01087654321,456 Delivery St`;

console.log(JSON.stringify(parseCsv(csv), null, 2));
