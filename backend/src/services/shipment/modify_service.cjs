const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'shipment.service.ts');
let content = fs.readFileSync(servicePath, 'utf8');

// Replace listShipments
content = content.replace(
  `  async listShipments(companyId?: string) {
    const query = companyId ? { companyId } : {};
    return Shipment.find(query).sort({ createdAt: -1 }).lean();
  }`,
  `  async listShipments(companyId?: string) {
    const query: any = companyId ? { companyId } : {};
    query.status = { $nin: [ShipmentStatus.PENDING_FINANCE_APPROVAL, ShipmentStatus.REJECTED, ShipmentStatus.CANCELLED, ShipmentStatus.DRAFT] };
    query.trackingNumber = { $not: /^__INVALID_/ };
    return Shipment.find(query).sort({ createdAt: -1 }).lean();
  }`
);

// New methods code
const newMethods = `
  /**
   * stageCsvImport: A "corrected submission" after a REJECTED batch is always a brand-new call
   * producing a new batchId. It never mutates or resurrects the original REJECTED batch.
   */
  async stageCsvImport(companyId: string, actorId: string, rawCsvContent: string) {
    const { parseShipmentCsv } = await import("../../utils/csv.parser.js");
    const { Hub } = await import("../../models/Hub.model.js");
    const { Vehicle } = await import("../../models/Vehicle.model.js");
    const { User } = await import("../../models/User.model.js");
    
    await Shipment.updateMany(
      { companyId, createdBy: actorId, status: ShipmentStatus.DRAFT },
      { $set: { status: ShipmentStatus.CANCELLED } }
    );
    
    const rows = parseShipmentCsv(rawCsvContent);
    const batchId = new mongoose.Types.ObjectId().toString();
    const stagedShipments: any[] = [];
    
    const uniqueDrivers = [...new Set(rows.map(r => r.driver_phone))];
    const uniqueVehicles = [...new Set(rows.map(r => r.vehicle_plate))];
    const uniqueHubs = [...new Set(rows.map(r => r.origin_hub_code))];
    
    const drivers = await User.find({ phone: { $in: uniqueDrivers }, companyId, role: "DRIVER" }).lean();
    const vehicles = await Vehicle.find({ plateNumber: { $in: uniqueVehicles }, companyId }).lean();
    const hubs = await Hub.find({ code: { $in: uniqueHubs }, companyId }).lean();
    
    const driverMap = new Map(drivers.map(d => [d.phone, d._id]));
    const vehicleMap = new Map(vehicles.map(v => [v.plateNumber, v._id]));
    const hubMap = new Map(hubs.map(h => [h.code, h._id]));

    const existingTrackingSet = new Set(
      (await Shipment.find({ 
        companyId, 
        trackingNumber: { $in: rows.map(r => r.shipment_code) },
        status: { $ne: ShipmentStatus.REJECTED },
        trackingNumber: { $not: /^__INVALID_/ } 
      }, 'trackingNumber').lean()).map(s => s.trackingNumber)
    );
    
    const intraFileTracking = new Set();
    
    for (const row of rows) {
      const errors: string[] = [];
      let finalTracking = row.shipment_code;
      
      if (!row.shipment_code) errors.push("Missing tracking number");
      else if (existingTrackingSet.has(row.shipment_code)) errors.push("Duplicate tracking number in DB");
      else if (intraFileTracking.has(row.shipment_code)) errors.push("Duplicate tracking number in file");
      
      if (!row.customer_name) errors.push("Missing customer name");
      if (!row.customer_phone || !/^[0-9]+$/.test(row.customer_phone)) errors.push("Invalid customer phone");
      if (!row.customer_address) errors.push("Missing customer address");
      if (row.customer_email && !/\\S+@\\S+\\.\\S+/.test(row.customer_email)) errors.push("Invalid customer email");
      
      if (row.cargo_weight_kg < 0) errors.push("Invalid cargo weight");
      if (row.cod_amount < 0) errors.push("Invalid COD amount");
      
      let driverId = undefined;
      if (row.driver_phone) {
        driverId = driverMap.get(row.driver_phone);
        if (!driverId) errors.push(\`Driver not found for phone: \${row.driver_phone}\`);
      }
      
      let vehicleId = undefined;
      if (row.vehicle_plate) {
        vehicleId = vehicleMap.get(row.vehicle_plate);
        if (!vehicleId) errors.push(\`Vehicle not found for plate: \${row.vehicle_plate}\`);
      }
      
      let hubId = undefined;
      if (row.origin_hub_code) {
        hubId = hubMap.get(row.origin_hub_code);
        if (!hubId) errors.push(\`Hub not found for code: \${row.origin_hub_code}\`);
      }
      
      if (errors.length > 0 && finalTracking) {
         finalTracking = \`__INVALID_\${row.rowNumber}_\${Date.now()}_\${finalTracking}\`;
      } else if (errors.length > 0) {
         finalTracking = \`__INVALID_\${row.rowNumber}_\${Date.now()}\`;
      } else {
         intraFileTracking.add(row.shipment_code);
      }
      
      stagedShipments.push({
        companyId,
        trackingNumber: finalTracking,
        customerName: row.customer_name || "UNKNOWN",
        customerPhone: row.customer_phone || "0000",
        customerEmail: row.customer_email,
        pickupAddress: row.origin_hub_code || "UNKNOWN",
        deliveryAddress: row.customer_address || "UNKNOWN",
        cargoWeightKg: row.cargo_weight_kg,
        codAmount: row.cod_amount,
        originHubCode: row.origin_hub_code,
        vehiclePlate: row.vehicle_plate,
        driverPhone: row.driver_phone,
        assignedDriver: driverId,
        assignedVehicle: vehicleId,
        status: ShipmentStatus.DRAFT,
        createdBy: actorId,
        batchId,
        importedVia: "CSV_BULK",
        validationErrors: errors
      });
    }
    
    if (stagedShipments.length > 0) {
      await Shipment.insertMany(stagedShipments, { ordered: false });
    }
    
    return { batchId, totalRows: rows.length };
  }

  async submitBatchForApproval(batchId: string, companyId: string, actorId: string) {
    const shipments = await Shipment.find({ batchId, companyId, status: ShipmentStatus.DRAFT }).lean();
    if (shipments.length === 0) {
        const err = new Error("No draft shipments found for this batch") as any;
        err.status = 404;
        throw err;
    }
    
    const owner = shipments[0].createdBy?.toString();
    if (owner !== actorId) {
      const error = new Error("Forbidden: You do not own this batch") as any;
      error.status = 403;
      throw error;
    }
    
    const hasErrors = shipments.some(s => s.validationErrors && s.validationErrors.length > 0);
    if (hasErrors) {
      const error = new Error("Validation errors must be resolved before submission") as any;
      error.status = 400;
      throw error;
    }
    
    const res = await Shipment.updateMany(
      { batchId, companyId, status: ShipmentStatus.DRAFT },
      { $set: { status: ShipmentStatus.PENDING_FINANCE_APPROVAL, submittedBy: new mongoose.Types.ObjectId(actorId), submittedAt: new Date() } }
    );
    
    if (res.modifiedCount === 0) {
      const error = new Error("Conflict: Batch already submitted or cancelled") as any;
      error.status = 409;
      throw error;
    }
    
    return { batchId, submittedCount: res.modifiedCount };
  }

  async approveImportBatch(batchId: string, companyId: string, actorId: string) {
    const dbAdmin = mongoose.connection.db?.admin();
    if (!dbAdmin) {
       const e = new Error("Database admin not available") as any; e.status = 503; throw e;
    }
    
    const isMaster = await dbAdmin.command({ hello: 1 });
    if (!isMaster.setName) {
      const err = new Error("Service Unavailable: MongoDB Replica Set required for transactions") as any;
      err.status = 503;
      throw err;
    }

    const shipments = await Shipment.find({ batchId, companyId }).lean();
    if (shipments.length === 0) {
        const e = new Error("Batch not found") as any; e.status = 404; throw e;
    }
    
    const hasErrors = shipments.some(s => s.validationErrors && s.validationErrors.length > 0);
    if (hasErrors) {
      const error = new Error("Validation errors remain in this batch") as any;
      error.status = 400;
      throw error;
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updateRes = await Shipment.updateMany(
        { batchId, companyId, status: ShipmentStatus.PENDING_FINANCE_APPROVAL },
        { $set: { status: ShipmentStatus.APPROVED, approvedBy: new mongoose.Types.ObjectId(actorId), approvedAt: new Date() } },
        { session }
      );
      
      if (updateRes.modifiedCount === 0) {
        const error = new Error("Conflict: Batch status has changed") as any;
        error.status = 409;
        throw error;
      }
      
      const timelineEvents = shipments.map(s => ({
        shipmentId: s._id,
        companyId,
        eventType: ShipmentEventType.BATCH_APPROVED,
        message: "Batch approved by Finance",
        createdBy: actorId,
        metadata: { status: ShipmentStatus.APPROVED, batchId }
      }));
      await ShipmentTimeline.insertMany(timelineEvents, { session });
      
      await session.commitTransaction();
      session.endSession();
      
      const { getIo } = await import("../socket/socket.js");
      getIo().to(\`company_\${companyId}\`).emit("shipments:bulk_approved", { batchId });
      
      return { batchId, approvedCount: updateRes.modifiedCount };
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  async rejectImportBatch(batchId: string, companyId: string, actorId: string, rejectionReason: string) {
    const updateRes = await Shipment.updateMany(
      { batchId, companyId, status: ShipmentStatus.PENDING_FINANCE_APPROVAL },
      { $set: { status: ShipmentStatus.REJECTED, rejectionReason } }
    );
    
    if (updateRes.modifiedCount === 0) {
      const error = new Error("Conflict: Batch status has changed") as any;
      error.status = 409;
      throw error;
    }
    
    const shipments = await Shipment.find({ batchId, companyId }, '_id').lean();
    const timelineEvents = shipments.map(s => ({
      shipmentId: s._id,
      companyId,
      eventType: ShipmentEventType.BATCH_REJECTED,
      message: \`Batch rejected: \${rejectionReason}\`,
      createdBy: actorId,
      metadata: { status: ShipmentStatus.REJECTED, batchId, rejectionReason }
    }));
    await ShipmentTimeline.insertMany(timelineEvents);
    
    return { batchId, rejectedCount: updateRes.modifiedCount };
  }

  async cancelStagedBatch(batchId: string, companyId: string, actorId: string) {
    const shipments = await Shipment.find({ batchId, companyId }).lean();
    if (shipments.length === 0) {
        const e = new Error("Batch not found") as any; e.status=404; throw e;
    }
    
    const status = shipments[0].status;
    if (status === ShipmentStatus.DRAFT) {
      if (shipments[0].createdBy?.toString() !== actorId) {
        const error = new Error("Forbidden: You do not own this batch") as any;
        error.status = 403;
        throw error;
      }
    } else if (status === ShipmentStatus.PENDING_FINANCE_APPROVAL) {
      if (shipments[0].submittedBy?.toString() !== actorId) {
        const error = new Error("Forbidden: You do not own this batch") as any;
        error.status = 403;
        throw error;
      }
    } else {
      const error = new Error(\`Cannot cancel batch in status: \${status}\`) as any;
      error.status = 409;
      throw error;
    }
    
    const updateRes = await Shipment.updateMany(
      { batchId, companyId, status: { $in: [ShipmentStatus.DRAFT, ShipmentStatus.PENDING_FINANCE_APPROVAL] } },
      { $set: { status: ShipmentStatus.CANCELLED } }
    );
    
    if (updateRes.modifiedCount === 0) {
      const error = new Error("Conflict: Batch status has changed") as any;
      error.status = 409;
      throw error;
    }
    
    const timelineEvents = shipments.map(s => ({
      shipmentId: s._id,
      companyId,
      eventType: ShipmentEventType.BATCH_CANCELLED,
      message: "Batch cancelled by Maker",
      createdBy: actorId,
      metadata: { status: ShipmentStatus.CANCELLED, batchId }
    }));
    await ShipmentTimeline.insertMany(timelineEvents);
    
    return { batchId, cancelledCount: updateRes.modifiedCount };
  }

  async overrideBatchDecision(batchId: string, companyId: string, ownerId: string, newStatus: string, reason: string) {
    if (newStatus === ShipmentStatus.APPROVED) {
      const shipments = await Shipment.find({ batchId, companyId, status: ShipmentStatus.REJECTED }).lean();
      if (shipments.length === 0) {
          const e=new Error("Batch not found or not in REJECTED state") as any; e.status=404; throw e;
      }
      
      const hasErrors = shipments.some(s => s.validationErrors && s.validationErrors.length > 0);
      if (hasErrors) {
        const error = new Error("Validation errors remain in this batch") as any;
        error.status = 400;
        throw error;
      }
      
      const dbAdmin = mongoose.connection.db?.admin();
      if (!dbAdmin) { const e=new Error("Database admin not available") as any; e.status=503; throw e; }
      const isMaster = await dbAdmin.command({ hello: 1 });
      if (!isMaster.setName) {
        const err = new Error("Service Unavailable: MongoDB Replica Set required") as any;
        err.status = 503;
        throw err;
      }

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const updateRes = await Shipment.updateMany(
          { batchId, companyId, status: ShipmentStatus.REJECTED },
          { $set: { status: ShipmentStatus.APPROVED, approvedBy: new mongoose.Types.ObjectId(ownerId), approvedAt: new Date() } },
          { session }
        );
        
        const timelineEvents = shipments.map(s => ({
          shipmentId: s._id,
          companyId,
          eventType: ShipmentEventType.BATCH_OVERRIDDEN,
          message: \`Batch overridden to APPROVED: \${reason}\`,
          createdBy: ownerId,
          metadata: { status: ShipmentStatus.APPROVED, batchId, reason }
        }));
        await ShipmentTimeline.insertMany(timelineEvents, { session });
        
        await session.commitTransaction();
        session.endSession();
        
        const { getIo } = await import("../socket/socket.js");
        getIo().to(\`company_\${companyId}\`).emit("shipments:bulk_approved", { batchId });
        
        return { batchId, updatedCount: updateRes.modifiedCount };
      } catch (e) {
        await session.abortTransaction();
        session.endSession();
        throw e;
      }
    } else if (newStatus === ShipmentStatus.REJECTED) {
      const updateRes = await Shipment.updateMany(
        { batchId, companyId, status: ShipmentStatus.APPROVED },
        { $set: { status: ShipmentStatus.REJECTED, rejectionReason: reason } }
      );
      
      if (updateRes.modifiedCount > 0) {
        const shipments = await Shipment.find({ batchId, companyId }, '_id').lean();
        const timelineEvents = shipments.map(s => ({
          shipmentId: s._id,
          companyId,
          eventType: ShipmentEventType.BATCH_OVERRIDDEN,
          message: \`Batch overridden to REJECTED: \${reason}\`,
          createdBy: ownerId,
          metadata: { status: ShipmentStatus.REJECTED, batchId, reason }
        }));
        await ShipmentTimeline.insertMany(timelineEvents);
      }
      
      return { batchId, updatedCount: updateRes.modifiedCount };
    }
    const e = new Error("Invalid override status") as any;
    e.status = 400;
    throw e;
  }

  async listPendingBatches(companyId: string) {
    return Shipment.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: ShipmentStatus.PENDING_FINANCE_APPROVAL } },
      { $group: { _id: "$batchId", count: { $sum: 1 }, submittedAt: { $first: "$submittedAt" }, submittedBy: { $first: "$submittedBy" } } }
    ]);
  }

  async getBatchDetailsForFinance(batchId: string, companyId: string) {
    const shipments = await Shipment.find({ 
      batchId, 
      companyId, 
      status: { $in: [ShipmentStatus.PENDING_FINANCE_APPROVAL, ShipmentStatus.APPROVED, ShipmentStatus.REJECTED] } 
    }).lean();
    return { batchId, shipments };
  }

  async getBatchDetailsForAccountant(batchId: string, companyId: string, actorId: string) {
    const shipments = await Shipment.find({ 
      batchId, 
      companyId, 
      createdBy: new mongoose.Types.ObjectId(actorId) 
    }).lean();
    return { batchId, shipments };
  }

  async cleanupStaleBatches() {
    const threshold = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const staleShipments = await Shipment.find({
      status: ShipmentStatus.PENDING_FINANCE_APPROVAL,
      submittedAt: { $lt: threshold }
    }, '_id batchId companyId').lean();
    
    if (staleShipments.length === 0) return { expiredCount: 0 };
    
    const res = await Shipment.updateMany(
      { status: ShipmentStatus.PENDING_FINANCE_APPROVAL, submittedAt: { $lt: threshold } },
      { $set: { status: ShipmentStatus.CANCELLED } }
    );
    
    const timelineEvents = staleShipments.map(s => ({
      shipmentId: s._id,
      companyId: s.companyId,
      eventType: ShipmentEventType.BATCH_AUTO_EXPIRED,
      message: "Batch auto-expired after 72h",
      metadata: { status: ShipmentStatus.CANCELLED, batchId: s.batchId }
    }));
    await ShipmentTimeline.insertMany(timelineEvents);
    
    return { expiredCount: res.modifiedCount };
  }
`;

content = content.replace(/}\s*$/, newMethods + '\n}\n');

fs.writeFileSync(servicePath, content, 'utf8');
console.log('Successfully updated shipment.service.ts');
