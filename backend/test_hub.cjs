const mongoose = require("mongoose");
const path = require("path");

async function run() {
  await mongoose.connect('mongodb://localhost:27017/logicore');
  const db = mongoose.connection.db;

  try {
    const hubs = await db.collection("hubs").find({ 
      hubCode: { $in: ["HUB-CAI-MC"] }, 
      companyId: new mongoose.Types.ObjectId("6a52522b40c00d2f851d71f4") 
    }).toArray();
    
    console.log("Found hubs:", hubs.length);
    if (hubs.length > 0) {
      console.log("Hub code:", hubs[0].hubCode);
      const hubMap = new Map(hubs.map(h => [h.hubCode, h._id]));
      console.log("Map get HUB-CAI-MC:", hubMap.get("HUB-CAI-MC"));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
