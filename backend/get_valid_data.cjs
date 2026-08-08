const mongoose = require("mongoose");

async function getData() {
  await mongoose.connect("mongodb://localhost:27017/logicore");

  try {
    const Hub = mongoose.connection.collection("hubs");
    const validHub = await Hub.findOne({});
    console.log("Valid Hub Code:", validHub ? validHub.code : "None");

    const User = mongoose.connection.collection("users");
    const validDriver = await User.findOne({ role: "DRIVER" });
    console.log("Valid Driver Phone:", validDriver ? validDriver.phone : "None");

    const Vehicle = mongoose.connection.collection("vehicles");
    const validVehicle = await Vehicle.findOne({});
    console.log("Valid Vehicle Plate:", validVehicle ? validVehicle.plateNumber : "None");
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

getData();
