import mongoose from "mongoose";
import { Shipment } from "../../models/Shipment.model.js";
import { ShipmentTimeline } from "../../models/Shipment Timeline.model.js";
import { ShipmentStatus, ShipmentEventType, PaymentMethod } from "../../types/shipment.type.js";
import { generateOtp, verifyOtp } from "./otp.service.js";

export class ShipmentService {
  async listShipments(companyId?: string) {
    const query = companyId ? { companyId } : {};
    return Shipment.find(query).sort({ createdAt: -1 }).lean();
  }

  async getShipmentById(id: string, companyId?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid shipment ID format");
    }

    if (!companyId) {
      throw new Error("Authentication context is required");
    }

    const shipment = await Shipment.findOne({ _id: new mongoose.Types.ObjectId(id), companyId })
      .populate("activeIncidentId")
      .lean();

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    // PR-07: Backward Compatibility Layer
    // Reconstruct the legacy `incidentDetails` payload dynamically from the populated Incident
    // so existing frontend components (like the tracking page) don't break.
    if (shipment.activeIncidentId && typeof shipment.activeIncidentId === "object") {
      const incident = shipment.activeIncidentId as any;
      (shipment as any).incidentDetails = {
        reason: incident.metadata?.reason || "OTHER",
        comment: incident.description,
        proofImage: (incident.attachments && incident.attachments.length > 0) 
                      ? incident.attachments[0] 
                      : incident.metadata?.proofImage,
        reportedBy: incident.reportedBy,
        reporterRole: incident.metadata?.reporterRole || "DRIVER", // Legacy fallback
        reportedAt: incident.createdAt,
      };
      
      // Keep activeIncidentId as a clean string ID for modern API consumers
      shipment.activeIncidentId = incident._id;
    }

    const timeline = await ShipmentTimeline.find({ shipmentId: shipment._id })
      .sort({ createdAt: 1 })
      .lean();

    return { shipment, timeline };
  }

  async updateShipmentStatus(id: string, payload: { status: ShipmentStatus; note?: string; actorId?: string; companyId?: string }) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid shipment ID format");
    }

    if (!payload.companyId) {
      throw new Error("Authentication context is required");
    }

    // Block direct transitions to DELIVERED — must use OTP handshake
    if (payload.status === ShipmentStatus.DELIVERED) {
      throw new Error(
        "Shipments cannot be set to DELIVERED directly. Use POST /api/shipments/:id/verify-otp to complete the delivery handshake."
      );
    }

    const shipment = await Shipment.findOne({ _id: new mongoose.Types.ObjectId(id), companyId: payload.companyId });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    const nextStatus = payload.status;
    const allowedStatuses = Object.values(ShipmentStatus).filter(
      (s) => s !== ShipmentStatus.DELIVERED
    );

    if (!allowedStatuses.includes(nextStatus)) {
      throw new Error("Invalid shipment status");
    }

    shipment.status = nextStatus;
    await shipment.save();

    await ShipmentTimeline.create({
      shipmentId: shipment._id,
      companyId: shipment.companyId,
      eventType: nextStatus as unknown as ShipmentEventType,
      message: payload.note || `Status updated to ${nextStatus}`,
      ...(payload.actorId ? { createdBy: new mongoose.Types.ObjectId(payload.actorId) } : {}),
      metadata: { status: nextStatus },
    });

    // Auto-generate a delivery OTP when shipment moves to OUT_FOR_DELIVERY
    if (nextStatus === ShipmentStatus.OUT_FOR_DELIVERY) {
      const otpCode = await generateOtp(id);
      
      // Trigger the dual-channel notification (Gmail & WhatsApp)
      const trackingLink = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/tracking/${shipment.trackingNumber}`;
      const { sendDeliveryNotifications } = await import("../notification/notification.service.js");
      void sendDeliveryNotifications({
        customerName: shipment.customerName,
        customerEmail: shipment.customerEmail,
        customerPhone: shipment.customerPhone,
        otp: otpCode,
        trackingNumber: shipment.trackingNumber,
        trackingLink
      });

      // Return the OTP so the controller can emit it via Socket.io / SMS
      return { shipment, generatedOtp: otpCode };
    }

    return { shipment };
  }

  /**
   * verifyDeliveryOtp
   * Validates the supplied OTP then safely transitions the shipment to DELIVERED
   * and records the event in the timeline.
   */
  async verifyDeliveryOtp(
    id: string,
    code: string,
    actorId?: string,
    companyId?: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid shipment ID format");
    }

    if (!companyId) {
      throw new Error("Authentication context is required");
    }

    const shipment = await Shipment.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    if (shipment.status !== ShipmentStatus.OUT_FOR_DELIVERY) {
      throw new Error(
        `OTP delivery confirmation is only valid when the shipment status is OUT_FOR_DELIVERY. Current status: ${shipment.status}`
      );
    }

    // Delegate all OTP validation (expiry, rate-limiting, code match) to otp.service
    await verifyOtp(id, code);

    // Mark as delivered
    shipment.status = ShipmentStatus.DELIVERED;
    shipment.deliveredAt = new Date();
    await shipment.save();

    // Release COD amount to the driver's unreconciled cash balance
    if (shipment.paymentMethod === PaymentMethod.CASH_ON_DELIVERY && shipment.assignedDriver) {
      const { User } = await import("../../models/User.model.js");
      await User.findByIdAndUpdate(shipment.assignedDriver, {
        $inc: { unreconciledCash: shipment.codAmount }
      });
    }

    await ShipmentTimeline.create({
      shipmentId: shipment._id,
      companyId: shipment.companyId,
      eventType: ShipmentEventType.DELIVERED,
      message: "Shipment delivered — OTP handshake verified successfully",
      ...(actorId ? { createdBy: new mongoose.Types.ObjectId(actorId) } : {}),
      metadata: { status: ShipmentStatus.DELIVERED, verifiedViaOtp: true },
    });

    return shipment;
  }

  /**
   * bulkImport
   * Validates and imports an array of shipments, assigning them to drivers and handling duplicate tracking numbers.
   */
  async bulkImport(companyId: string, actorId: string, rows: any[]) {
    if (!companyId) {
      throw new Error("Authentication context is required");
    }

    const totalRows = rows.length;
    const failedRows: Array<{ row: number; trackingNumber: string; reason: string }> = [];
    const validShipments: any[] = [];
    const batchId = new mongoose.Types.ObjectId().toString();

    // 1. Pre-scan for intra-file duplicates
    const trackingNumberSet = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (trackingNumberSet.has(row.trackingNumber)) {
        failedRows.push({ row: i + 1, trackingNumber: row.trackingNumber, reason: "Duplicate tracking number within the same file" });
        continue;
      }
      trackingNumberSet.add(row.trackingNumber);
    }

    // Filter out intra-file duplicates before resolving drivers
    const uniqueRows = rows.filter(r => trackingNumberSet.has(r.trackingNumber) && !failedRows.some(f => f.trackingNumber === r.trackingNumber));

    // 2. Extract unique driver emails
    const uniqueDriverEmails = [...new Set(uniqueRows.map((r) => r.driverEmail))];

    // 3. Resolve driver emails to ObjectIds
    const { User } = await import("../../models/User.model.js");
    const drivers = await User.find({
      email: { $in: uniqueDriverEmails as string[] },
      companyId,
      role: "DRIVER"
    } as any).lean();

    const emailToDriverIdMap = new Map<string, mongoose.Types.ObjectId>();
    for (const driver of drivers) {
      emailToDriverIdMap.set(driver.email, driver._id as mongoose.Types.ObjectId);
    }

    // 4. Map rows to Shipment documents
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip if already failed (e.g. intra-file duplicate)
      if (failedRows.some(f => f.row === i + 1)) continue;

      const driverId = emailToDriverIdMap.get(row.driverEmail);

      if (!driverId) {
        failedRows.push({ row: i + 1, trackingNumber: row.trackingNumber, reason: `Driver not found: ${row.driverEmail}` });
        continue;
      }

      validShipments.push({
        companyId: new mongoose.Types.ObjectId(companyId),
        trackingNumber: row.trackingNumber,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        customerEmail: row.customerEmail,
        pickupAddress: row.pickupAddress,
        deliveryAddress: row.deliveryAddress,
        codAmount: row.codAmount,
        paymentMethod: row.paymentMethod || PaymentMethod.CASH_ON_DELIVERY,
        assignedDriver: driverId,
        status: ShipmentStatus.CREATED,
        createdBy: new mongoose.Types.ObjectId(actorId),
        batchId,
        importedVia: "CSV_BULK"
      });
    }

    // 5. Chunked Insert
    let successCount = 0;
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < validShipments.length; i += CHUNK_SIZE) {
      const chunk = validShipments.slice(i, i + CHUNK_SIZE);
      try {
        await Shipment.insertMany(chunk, { ordered: false });
        successCount += chunk.length;
      } catch (err: any) {
        // Handle MongoDB unordered insert errors (e.g., E11000 duplicate keys)
        if (err.name === 'BulkWriteError' && err.writeErrors) {
          const successfulInserts = err.insertedDocs ? err.insertedDocs.length : 0;
          successCount += successfulInserts;

          for (const writeError of err.writeErrors) {
            if (writeError.code === 11000) {
               // Find the original row number based on the tracking number that failed
               const failedDoc = chunk[writeError.index];
               const originalRowIndex = rows.findIndex(r => r.trackingNumber === failedDoc.trackingNumber);
               
               failedRows.push({
                 row: originalRowIndex + 1,
                 trackingNumber: failedDoc.trackingNumber,
                 reason: "Duplicate tracking number — already exists in system"
               });
            } else {
               const failedDoc = chunk[writeError.index];
               const originalRowIndex = rows.findIndex(r => r.trackingNumber === failedDoc.trackingNumber);
               failedRows.push({
                 row: originalRowIndex + 1,
                 trackingNumber: failedDoc?.trackingNumber || "UNKNOWN",
                 reason: writeError.errmsg || "Database insert error"
               });
            }
          }
        } else {
          // If it's a completely different error, rethrow
          throw err;
        }
      }
    }

    // Create timeline events for all successful shipments
    // We do this by finding all shipments inserted in this batch
    const insertedShipments = await Shipment.find({ batchId }, '_id').lean();
    if (insertedShipments.length > 0) {
      const timelineEvents = insertedShipments.map(s => ({
        shipmentId: s._id,
        companyId: new mongoose.Types.ObjectId(companyId),
        eventType: ShipmentEventType.CREATED,
        message: "Shipment created via bulk CSV import",
        createdBy: new mongoose.Types.ObjectId(actorId),
        metadata: { status: ShipmentStatus.CREATED, importedVia: "CSV_BULK", batchId }
      }));
      
      // We don't want timeline creation failures to fail the whole import, so catch errors
      try {
        await ShipmentTimeline.insertMany(timelineEvents, { ordered: false });
      } catch (err) {
        console.error("Failed to create some timeline events during bulk import:", err);
      }
    }

    return {
      batchId,
      totalRows,
      successCount,
      failedCount: failedRows.length,
      failedRows
    };
  }
}


