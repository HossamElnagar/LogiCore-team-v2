import mongoose from "mongoose";

try {
  await mongoose.connect("mongodb://localhost:27017/admin");

  console.log("✅ Connected to admin");

  const result = await mongoose.connection.db.command({
    connectionStatus: 1,
  });

  console.log(JSON.stringify(result, null, 2));

} catch (error) {
  console.error("❌ ERROR");
  console.error(error);
} finally {
  await mongoose.disconnect();
}