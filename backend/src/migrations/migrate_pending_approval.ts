/**
 * migrate_pending_approval.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot data migration script: renames legacy ShipmentStatus value
 * PENDING_APPROVAL to PENDING_FINANCE_APPROVAL in the shipments collection.
 *
 * ## Safety guarantees
 *  - Idempotent: re-running produces 0 additional changes if already applied.
 *  - Non-destructive: uses `updateMany` with targeted filter; only the
 *    `status` field is touched. All other fields remain untouched.
 *  - Dry-run mode: set `DRY_RUN=true` env var to preview counts without writing.
 *
 * ## Prerequisites
 *  - Requires `MONGO_URI` environment variable.
 *  - Run from the backend directory:
 *      npx tsx src/migrations/migrate_pending_approval.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import process from "node:process";

function separator(char = "─", length = 72): string {
  return char.repeat(length);
}

async function runMigration() {
  const isDryRun = process.env.DRY_RUN === "true";
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/logicore";

  console.log(separator("═"));
  console.log(`🚀 Starting Database Migration: PENDING_APPROVAL → PENDING_FINANCE_APPROVAL`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔌 MongoDB URI: ${mongoUri.replace(/:([^:@]{3,})@/, ":***@")}`);
  console.log(`🛠️  Mode: ${isDryRun ? "DRY_RUN (No changes will be saved)" : "EXECUTE (Changes will be permanently saved)"}`);
  console.log(separator("═"));
  console.log("");

  if (!process.env.MONGO_URI) {
    console.warn("⚠️  WARNING: MONGO_URI is not set. Using local fallback.");
  }

  let dbConnection: typeof mongoose | null = null;
  try {
    dbConnection = await mongoose.connect(mongoUri);
    console.log("✅ Successfully connected to MongoDB.");
    console.log(`📦 Database: ${dbConnection.connection.name}`);
    console.log("");

    const db = dbConnection.connection.db;
    if (!db) {
      throw new Error("Database connection is null.");
    }
    const shipmentsCollection = db.collection("shipments");

    const query = { status: "PENDING_APPROVAL" };

    const matchedCount = await shipmentsCollection.countDocuments(query);

    console.log(separator());
    console.log(`🔍 Found ${matchedCount} shipments with status 'PENDING_APPROVAL'`);

    if (isDryRun) {
      console.log(`⏭️  Skipping update due to DRY_RUN=true`);
    } else {
      if (matchedCount > 0) {
        const updateResult = await shipmentsCollection.updateMany(query, {
          $set: { status: "PENDING_FINANCE_APPROVAL" },
        });
        console.log(`✅ Successfully updated ${updateResult.modifiedCount} shipments.`);
      } else {
        console.log(`✅ No shipments to update.`);
      }
    }
    
    console.log(separator());
    console.log(`🎉 Migration complete!`);

  } catch (error) {
    console.error("\n❌ FATAL ERROR: Migration failed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (dbConnection) {
      await dbConnection.disconnect();
      console.log("\n🔌 Disconnected from MongoDB.");
    }
  }
}

// Execute the script
if (process.argv[1] && (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1].endsWith('migrate_pending_approval.ts'))) {
  runMigration().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
