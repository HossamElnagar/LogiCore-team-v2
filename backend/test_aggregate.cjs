const mongoose = require("mongoose");


async function run() {
  await mongoose.connect('mongodb://localhost:27017/logicore');
  const db = mongoose.connection.db;

  try {
    const companyId = "6a52522b40c00d2f851d71f4";
    const status = "PENDING_FINANCE_APPROVAL"; // matching ShipmentStatus.PENDING_FINANCE_APPROVAL
    
    console.log("Looking for company:", companyId, "status:", status);

    const result = await db.collection("shipments").aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: status } },
      { $group: { _id: "$batchId", count: { $sum: 1 }, submittedAt: { $first: "$submittedAt" }, submittedBy: { $first: "$submittedBy" } } }
    ]).toArray();
    
    console.log("Aggregate result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
