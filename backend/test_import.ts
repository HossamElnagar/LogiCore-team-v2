import mongoose from "mongoose";
import dotenv from "dotenv";
import { ShipmentService } from "./src/services/shipment/shipment.service.js";

dotenv.config();

async function testBulkImport() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/logicore");
  console.log("Connected to MongoDB");

  try {
    // 1. Get a company and an actor
    const { User } = await import("./src/models/User.model.js");
    const { Company } = await import("./src/models/Company.model.js");

    const owner = await User.findOne({ role: "OWNER" });
    if (!owner) throw new Error("No owner found");

    const companyId = owner.companyId.toString();
    const actorId = owner._id.toString();

    // 2. Make sure we have a driver
    let driver = await User.findOne({ role: "DRIVER", companyId });
    if (!driver) {
      driver = await User.create({
        companyId,
        userName: "Test Driver",
        email: "test.driver@example.com",
        password: "password123",
        role: "DRIVER",
        authProvider: "LOCAL"
      });
      console.log("Created test driver:", driver.email);
    } else {
      console.log("Using existing driver:", driver.email);
    }

    // 3. Create mock rows
    const rows = [
      {
        trackingNumber: `TRK-TEST-${Date.now()}-1`,
        codAmount: 150,
        pickupAddress: "Main Warehouse",
        driverEmail: driver.email,
        customerName: "John Doe",
        customerPhone: "01012345678",
        deliveryAddress: "123 Delivery St"
      },
      {
        trackingNumber: `TRK-TEST-${Date.now()}-2`,
        codAmount: 250,
        pickupAddress: "Main Warehouse",
        driverEmail: driver.email,
        customerName: "Jane Doe",
        customerPhone: "01087654321",
        deliveryAddress: "456 Delivery St"
      }
    ];

    // 4. Test bulk import
    const shipmentService = new ShipmentService();
    const result = await shipmentService.bulkImport(companyId, actorId, rows);
    
    console.log("Import result:", JSON.stringify(result, null, 2));

  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    await mongoose.disconnect();
  }
}

testBulkImport();
