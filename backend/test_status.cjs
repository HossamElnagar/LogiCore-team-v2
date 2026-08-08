const mongoose = require("mongoose");

async function run() {
  await mongoose.connect('mongodb://localhost:27017/logicore');
  const db = mongoose.connection.db;

  try {
    const ships = await db.collection("shipments").find({ 
      trackingNumber: { $in: ["TRK-1001", "TRK-1002", "TRK-1003", "TRK-1004"] }
    }).toArray();
    
    console.log("Shipments found:", ships.length);
    ships.forEach(s => {
      console.log(`Tracking: ${s.trackingNumber}, Status: ${s.status}, BatchId: ${s.batchId}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
