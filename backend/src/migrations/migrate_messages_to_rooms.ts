/**
 * migrate_messages_to_rooms.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PR-04: One-shot data migration script that backfills `roomId` on existing
 * legacy `Message` documents.
 *
 * ## Strategy
 * 1. Finds all Messages where `roomId` is missing but `shipmentId` exists.
 * 2. Groups messages by their `shipmentId`.
 * 3. Looks up the associated `Shipment` to extract tenant (companyId) and
 *    assigned driver information.
 * 4. Finds or auto-creates a `ChatRoom` of type `INCIDENT` for that shipment.
 *    (Participants: Driver + Driver_Manager if available, otherwise just Driver).
 * 5. Updates the legacy messages with the resolved `roomId`.
 *
 * ## Safety guarantees
 * - Idempotent: Can be run multiple times safely.
 * - Dry-run mode: Set `DRY_RUN=true` to simulate the migration.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import process from "node:process";
import { ChatRoomType } from "../models/ChatRoom.model.js";

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("[migrate_messages_to_rooms] ❌ MONGO_URI environment variable is not set.");
    process.exit(1);
  }

  const isDryRun = process.env.DRY_RUN === "true";

  console.log("────────────────────────────────────────────────────────────────────────");
  console.log("  LogiCore — Message Schema Migration (roomId backfill)");
  console.log("────────────────────────────────────────────────────────────────────────");
  console.log(`  Mode:      ${isDryRun ? "🔍  DRY RUN  (no writes)" : "✏️   LIVE WRITE"}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log("────────────────────────────────────────────────────────────────────────");

  await mongoose.connect(mongoUri);
  console.log("  ✅  Connected to MongoDB.\n");

  const db = mongoose.connection.db;
  if (!db) throw new Error("Could not obtain a database handle.");

  const messages = db.collection("messages");
  const chatrooms = db.collection("chatrooms");
  const shipments = db.collection("shipments");
  const companies = db.collection("companies");

  // Find all messages that need a roomId
  const pendingCount = await messages.countDocuments({
    roomId: { $exists: false },
    shipmentId: { $exists: true, $ne: null },
  });

  console.log(`  Found ${pendingCount} legacy message(s) needing migration.`);

  if (pendingCount === 0) {
    console.log("  ✅  Migration is already complete or no legacy data exists.");
    await mongoose.disconnect();
    return;
  }

  // Cache resolved ChatRoom IDs to avoid duplicate creation
  const roomCache = new Map<string, mongoose.Types.ObjectId>();
  let updatedCount = 0;

  // We need a fallback companyId for orphaned shipments/messages
  const firstCompany = await companies.findOne({});
  const fallbackCompanyId = firstCompany?._id ?? new mongoose.Types.ObjectId();

  const cursor = messages.find({
    roomId: { $exists: false },
    shipmentId: { $exists: true, $ne: null },
  });

  for await (const msg of cursor) {
    const shipmentIdStr = String(msg.shipmentId);

    let roomId = roomCache.get(shipmentIdStr);

    if (!roomId) {
      // Look for an existing synthetic INCIDENT room for this old shipmentId
      const existingRoom = await chatrooms.findOne({ "metadata.legacyShipmentId": shipmentIdStr });

      if (existingRoom) {
        roomId = existingRoom._id as mongoose.Types.ObjectId;
      } else {
        // Attempt to resolve companyId and driver from the shipment
        let companyId = fallbackCompanyId;
        const participants: mongoose.Types.ObjectId[] = [];

        if (mongoose.Types.ObjectId.isValid(shipmentIdStr)) {
          const shipment = await shipments.findOne({ _id: new mongoose.Types.ObjectId(shipmentIdStr) });
          if (shipment) {
            companyId = shipment.companyId;
            if (shipment.assignedDriver) {
              participants.push(shipment.assignedDriver as mongoose.Types.ObjectId);
            }
          }
        }

        // Include the sender if not already in participants
        if (msg.senderId) {
          const senderIdStr = String(msg.senderId);
          if (!participants.some((p) => String(p) === senderIdStr)) {
            participants.push(msg.senderId as mongoose.Types.ObjectId);
          }
        }

        if (isDryRun) {
          // Generate a fake ID for dry-run output matching
          roomId = new mongoose.Types.ObjectId();
        } else {
          // Create the synthetic room
          const insertResult = await chatrooms.insertOne({
            companyId,
            type: ChatRoomType.INCIDENT,
            participants,
            incidentId: null, // Legacy chat has no real incident document pointer
            metadata: { legacyShipmentId: shipmentIdStr },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          roomId = insertResult.insertedId;
        }
      }
      roomCache.set(shipmentIdStr, roomId);
    }

    if (!isDryRun) {
      await messages.updateOne(
        { _id: msg._id },
        { $set: { roomId } }
      );
    }
    updatedCount++;

    if (updatedCount % 500 === 0) {
      console.log(`  Processed ${updatedCount} messages...`);
    }
  }

  console.log(`\n  ✅  ${isDryRun ? "Dry run completed." : "Migration completed."}`);
  console.log(`  ${updatedCount} message(s) updated.`);
  
  if (isDryRun) {
    console.log("\n  ⚠️  Run without DRY_RUN=true to apply these changes.");
  }

  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  console.error("\n  [migrate_messages_to_rooms] Fatal error:", err);
  process.exit(1);
});
