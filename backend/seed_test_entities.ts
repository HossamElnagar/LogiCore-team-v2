import mongoose from "mongoose";
import dotenv from "dotenv";
import { Company } from "./src/models/Company.model.js";
import { User } from "./src/models/User.model.js";
import { Hub } from "./src/models/Hub.model.js";
import { Vehicle } from "./src/models/Vehicle.model.js";
import { UserRole, AuthProvider } from "./src/types/user.type.js";

dotenv.config();

/**
 * Helper Seeder Script:
 * Easily add or inspect required Vehicles, Hubs, Drivers, and testing Accounts in your local MongoDB database!
 * Run using: npx tsx seed_test_entities.ts
 */
async function seedTestEntities() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/logicore";
  console.log("=========================================================");
  console.log("   🌱 SEEDING & CHECKING TEST ENTITIES FOR CSV IMPORT    ");
  console.log("=========================================================");
  
  await mongoose.connect(mongoUri);
  console.log(`✅ Connected to database: ${mongoUri}\n`);

  try {
    // 1. Get or Create active Company
    let company = await Company.findOne({ isActive: true });
    if (!company) {
      const dummyOwnerId = new mongoose.Types.ObjectId();
      company = await Company.create({
        companyName: "LogiCore Express egypt",
        companyEmail: "admin@logicore.com",
        slug: "logicore-express",
        phone: "01000000001",
        industry: "LOGISTICS",
        ownerId: dummyOwnerId,
        isActive: true,
      });
      console.log(`✨ Created new default Company: ${company.companyName}`);
    } else {
      console.log(`🏢 Using existing active Company: ${company.companyName} (ID: ${company._id})`);
    }
    const companyId = (company._id as mongoose.Types.ObjectId).toString();

    // 2. Add Test Hub (Origin Hub Code)
    const hubCode = "HUB-CAI-MC";
    let hub = await Hub.findOne({ companyId, hubCode });
    if (!hub) {
      hub = await Hub.create({
        companyId,
        hubCode: hubCode,
        name: "Cairo Logistics Hub (Nasr City)",
        city: "Cairo",
        isActive: true,
      });
      console.log(`➕ Added NEW Origin Hub: [${hub.hubCode}] - ${hub.name}`);
    } else {
      console.log(`✔ Found Origin Hub in DB: [${hub.hubCode}] - ${hub.name}`);
    }

    // 3. Add Test Vehicle (Plate Number)
    const plateNumber = "MC-V889";
    let vehicle = await Vehicle.findOne({ companyId, plateNumber });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        companyId,
        plateNumber: plateNumber,
        model: "Mercedes Sprinter Van",
        maxWeightKg: 3000,
        isActive: true,
      });
      console.log(`➕ Added NEW Vehicle Plate: [${vehicle.plateNumber}] (${vehicle.model})`);
    } else {
      console.log(`✔ Found Vehicle in DB: [${vehicle.plateNumber}] (${vehicle.model})`);
    }

    // 4. Add Test Driver (Phone Number)
    const driverPhone = "01098765432";
    let driver = await User.findOne({ companyId, phone: driverPhone, role: UserRole.DRIVER as any });
    if (!driver) {
      driver = await User.create({
        companyId,
        userName: "Hassan Express Driver",
        email: "driver.hassan@logicore.com",
        phone: driverPhone,
        password: "Password123!",
        role: UserRole.DRIVER as any,
        authProvider: AuthProvider.LOCAL as any,
        isActive: true,
      });
      console.log(`➕ Added NEW Delivery Driver: [${driver.userName}] - Phone: ${driver.phone}`);
    } else {
      console.log(`✔ Found Driver in DB: [${driver.userName}] - Phone: ${driver.phone}`);
    }

    // 5. Check/Add Accountant (Maker)
    let accountant = await User.findOne({ companyId, role: UserRole.ACCOUNTANT as any });
    if (!accountant) {
      accountant = await User.create({
        companyId,
        userName: "Mona Accountant",
        email: "accountant@logicore.com",
        password: "Password123!",
        role: UserRole.ACCOUNTANT as any,
        authProvider: AuthProvider.LOCAL as any,
        isActive: true,
      });
      console.log(`➕ Added NEW Accountant (Maker): ${accountant.email} | Password: Password123!`);
    } else {
      console.log(`✔ Found Accountant (Maker): ${accountant.email}`);
    }

    // 6. Check/Add Finance Manager (Checker)
    let finance = await User.findOne({ companyId, role: UserRole.FINANCE_MANAGER as any });
    if (!finance) {
      finance = await User.create({
        companyId,
        userName: "Tarek Finance Manager",
        email: "finance@logicore.com",
        password: "Password123!",
        role: UserRole.FINANCE_MANAGER as any,
        authProvider: AuthProvider.LOCAL as any,
        isActive: true,
      });
      console.log(`➕ Added NEW Finance Manager (Checker): ${finance.email} | Password: Password123!`);
    } else {
      console.log(`✔ Found Finance Manager (Checker): ${finance.email}`);
    }

    console.log("\n=========================================================");
    console.log("   🎉 ALL TEST DATA IS READY FOR YOU TO COPY & PASTE!   ");
    console.log("=========================================================");
    console.log("👉 Use the following values in your CSV spreadsheet test:");
    console.log(`   - origin_hub_code:  ${hub.hubCode}`);
    console.log(`   - vehicle_plate:    ${vehicle.plateNumber}`);
    console.log(`   - driver_phone:     ${driver.phone}`);
    console.log("=========================================================\n");

  } catch (error) {
    console.error("❌ Seeding Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedTestEntities();
