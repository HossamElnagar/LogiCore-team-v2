const mongoose = require("mongoose");

async function run() {
  await mongoose.connect("mongodb://localhost:27017/logicore");
  const db = mongoose.connection.db;

  // 1. Update driver phone
  await db.collection("users").updateOne(
    { role: "DRIVER", userName: "driver1" },
    { $set: { phone: "+201001234567" } }
  );

  // 2. Ensure vehicle exists
  const c = await db.collection("vehicles").findOne({ plateNumber: "ABC-123" });
  if (!c) {
    // Get company ID from driver
    const d = await db.collection("users").findOne({ role: "DRIVER" });
    await db.collection("vehicles").insertOne({
      companyId: d.companyId,
      plateNumber: "ABC-123",
      vehicleType: "VAN",
      capacityKg: 1000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });
  }

  await mongoose.disconnect();
}
run();
