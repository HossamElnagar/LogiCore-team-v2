const mongoose = require("mongoose");

async function generateValidCsv() {
  await mongoose.connect("mongodb://localhost:27017/logicore");

  try {
    // 1. Get a valid Hub
    const Hub = mongoose.connection.collection("hubs");
    const validHub = await Hub.findOne({});
    const hubCode = validHub ? validHub.code : "HUB-123";

    // 2. Get a valid Driver
    const User = mongoose.connection.collection("users");
    const validDriver = await User.findOne({ role: "DRIVER" });
    const driverPhone = validDriver && validDriver.phone ? validDriver.phone : "01000000000";

    // 3. Get a valid Vehicle
    const Vehicle = mongoose.connection.collection("vehicles");
    const validVehicle = await Vehicle.findOne({});
    const vehiclePlate = validVehicle ? validVehicle.plateNumber : "ABC-123";
    
    // Customer phone valid format - assume Egyptian standard 11 digits starting with 01
    const validCustPhone = "01012345678";

    console.log("Valid Hub Code:", hubCode);
    console.log("Valid Driver Phone:", driverPhone);
    console.log("Valid Vehicle Plate:", vehiclePlate);
    
    const csvData = \`shipment_code,driver_phone,vehicle_plate,origin_hub_code,destination_city,customer_name,customer_phone,customer_email,customer_address,cargo_weight_kg,cod_amount,estimated_delivery,notes
TRK-2001,\${driverPhone},\${vehiclePlate},\${hubCode},Cairo,John Doe,\${validCustPhone},john@example.com,123 Main St Cairo,5.5,150.00,2026-08-10,Leave at door
TRK-2002,\${driverPhone},\${vehiclePlate},\${hubCode},Alexandria,Jane Smith,\${validCustPhone},jane@example.com,45 Sea View Road,12.0,300.00,2026-08-11,
\`;
    
    const fs = require('fs');
    fs.writeFileSync('d:/LogiCore-team-v2/sample_shipments_valid.csv', csvData, 'utf8');
    console.log("Saved to sample_shipments_valid.csv");
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

generateValidCsv();
