import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { IncidentService, IncidentError, IncidentErrorCode } from "../src/services/incident.service.js";
import { Incident } from "../src/models/Incedent.model.js";
import { Shipment } from "../src/models/Shipment.model.js";
import { ShipmentTimeline } from "../src/models/Shipment Timeline.model.js";
import {
  IncidentEntityType,
  IncidentSeverity,
  IncidentStatus,
} from "../src/types/incident.type.js";
import { ShipmentStatus, IncidentReason } from "../src/types/shipment.type.js";

// ── Helper to build a mock shipment document ────────────────────────────────

function buildMockShipment(overrides: Record<string, unknown> = {}) {
  const id = new mongoose.Types.ObjectId();
  const companyId = new mongoose.Types.ObjectId();
  const driverId = new mongoose.Types.ObjectId();
  return {
    _id: id,
    companyId,
    trackingNumber: "TRK-TEST-001",
    status: ShipmentStatus.OUT_FOR_DELIVERY,
    assignedDriver: driverId,
    deliveryLat: 30.0444,
    deliveryLng: 31.2357,
    incidentDetails: undefined as any,
    save: async function () { return this; },
    ...overrides,
  };
}

// ── Helper to build a mock incident doc ─────────────────────────────────────

type IncidentDoc = {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  relatedEntityType: IncidentEntityType;
  relatedEntityId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  save: () => Promise<void>;
};

function buildIncidentDoc(overrides: Partial<IncidentDoc> = {}): IncidentDoc {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id,
    companyId: new mongoose.Types.ObjectId(),
    title: "Test incident",
    description: "A test incident",
    severity: IncidentSeverity.MEDIUM,
    status: IncidentStatus.OPEN,
    relatedEntityType: IncidentEntityType.SHIPMENT,
    relatedEntityId: new mongoose.Types.ObjectId(),
    reportedBy: new mongoose.Types.ObjectId(),
    save: async () => undefined,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Driver ground ingress creates incident with Haversine validation
// ═══════════════════════════════════════════════════════════════════════════════

test("driver ground ingress: creates incident when within geo-fence", async () => {
  const service = new IncidentService();
  const companyId = new mongoose.Types.ObjectId();
  const driverId = new mongoose.Types.ObjectId();
  const shipmentId = new mongoose.Types.ObjectId();

  const mockShipment = buildMockShipment({
    _id: shipmentId,
    companyId,
    assignedDriver: driverId,
  });

  const originalShipmentFindOne = Shipment.findOne;
  const originalIncidentCreate = Incident.create;
  const originalTimelineCreate = ShipmentTimeline.create;

  // Stub Shipment.findOne to return our mock
  (Shipment as any).findOne = async () => mockShipment;

  // Stub Incident.create to return a mock incident
  (Incident as any).create = async (payload: any) => ({
    ...payload,
    _id: new mongoose.Types.ObjectId(),
  });

  // Stub timeline
  (ShipmentTimeline as any).create = async () => ({ _id: new mongoose.Types.ObjectId() });

  try {
    const result = await service.logDriverIncident(
      {
        shipmentId: shipmentId.toString(),
        reason: IncidentReason.CLIENT_REFUSED,
        comment: "Client refused to accept the package.",
        driverLat: 30.0444,     // Same as delivery location (0m distance)
        driverLng: 31.2357,
        proofImage: "https://storage.example.com/proof/img-001.jpg",
      },
      companyId.toString(),
      driverId.toString(),
      "DRIVER"
    );

    assert.ok(result.incident, "Incident document should be created");
    assert.ok(result.shipment.activeIncidentId, "activeIncidentId should be defined");
    assert.equal(result.shipment.status, ShipmentStatus.INCIDENT, "Shipment status should be INCIDENT");
  } finally {
    (Shipment as any).findOne = originalShipmentFindOne;
    (Incident as any).create = originalIncidentCreate;
    (ShipmentTimeline as any).create = originalTimelineCreate;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Driver geo-fence violation blocks incident creation
// ═══════════════════════════════════════════════════════════════════════════════

test("driver ground ingress: rejects when outside 150m geo-fence", async () => {
  const service = new IncidentService();
  const companyId = new mongoose.Types.ObjectId();
  const driverId = new mongoose.Types.ObjectId();
  const shipmentId = new mongoose.Types.ObjectId();

  const mockShipment = buildMockShipment({
    _id: shipmentId,
    companyId,
    assignedDriver: driverId,
    deliveryLat: 30.0444,
    deliveryLng: 31.2357,
  });

  const originalShipmentFindOne = Shipment.findOne;
  (Shipment as any).findOne = async () => mockShipment;

  try {
    await service.logDriverIncident(
      {
        shipmentId: shipmentId.toString(),
        reason: IncidentReason.NO_ANSWER,
        comment: "No one answered the door.",
        driverLat: 31.0000,     // Far away — should fail Haversine check
        driverLng: 32.0000,
        proofImage: "https://storage.example.com/proof/img-002.jpg",
      },
      companyId.toString(),
      driverId.toString(),
      "DRIVER"
    );

    assert.fail("Should have thrown IncidentError for geo-fence violation");
  } catch (error: any) {
    assert.ok(error instanceof IncidentError, "Error should be IncidentError");
    assert.equal(error.code, IncidentErrorCode.GEO_FENCE_VIOLATION);
    assert.equal(error.statusCode, 400);
  } finally {
    (Shipment as any).findOne = originalShipmentFindOne;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Admin ingress bypasses geo-fence validation
// ═══════════════════════════════════════════════════════════════════════════════

test("admin ingress: bypasses geo-fence and photo requirements", async () => {
  const service = new IncidentService();
  const companyId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const shipmentId = new mongoose.Types.ObjectId();

  const mockShipment = buildMockShipment({
    _id: shipmentId,
    companyId,
  });

  const originalShipmentFindOne = Shipment.findOne;
  const originalIncidentCreate = Incident.create;
  const originalTimelineCreate = ShipmentTimeline.create;

  (Shipment as any).findOne = async () => mockShipment;
  (Incident as any).create = async (payload: any) => ({
    ...payload,
    _id: new mongoose.Types.ObjectId(),
  });
  (ShipmentTimeline as any).create = async () => ({ _id: new mongoose.Types.ObjectId() });

  try {
    const result = await service.logAdminIncident(
      {
        shipmentId: shipmentId.toString(),
        reason: IncidentReason.WRONG_ADDRESS,
        comment: "Customer called to report wrong address on file.",
        // No driverLat, driverLng, no proofImage — all bypassed
      },
      companyId.toString(),
      adminId.toString(),
      "OPERATIONS_MANAGER"
    );

    assert.ok(result.incident, "Incident should be created even without GPS/photo");
    assert.equal(result.shipment.status, ShipmentStatus.INCIDENT);
  } finally {
    (Shipment as any).findOne = originalShipmentFindOne;
    (Incident as any).create = originalIncidentCreate;
    (ShipmentTimeline as any).create = originalTimelineCreate;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Incident status updates persist and set resolvedAt
// ═══════════════════════════════════════════════════════════════════════════════

test("incident status updates persist the new state and resolution timestamp", async () => {
  const service = new IncidentService();
  const companyId = new mongoose.Types.ObjectId().toString();
  const originalFindOne = Incident.findOne;
  const incident = buildIncidentDoc({
    companyId: new mongoose.Types.ObjectId(companyId),
    reportedBy: new mongoose.Types.ObjectId(),
    save: async () => {
      return undefined;
    },
  });

  (Incident as typeof Incident & { findOne: typeof Incident.findOne }).findOne = ((query: { companyId: string }) => {
    assert.equal(query.companyId.toString(), companyId);
    return incident;
  }) as unknown as typeof Incident.findOne;

  try {
    const updated = await service.updateIncidentStatus(
      incident._id.toString(),
      IncidentStatus.RESOLVED,
      companyId
    );

    assert.equal(updated.status, IncidentStatus.RESOLVED);
    assert.ok(updated.resolvedAt);
  } finally {
    (Incident as typeof Incident & { findOne: typeof Incident.findOne }).findOne = originalFindOne;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Role isolation — drivers cannot use admin ingress
// ═══════════════════════════════════════════════════════════════════════════════

test("role isolation: DRIVER role is rejected from admin ingress", async () => {
  const service = new IncidentService();
  const companyId = new mongoose.Types.ObjectId().toString();
  const driverId = new mongoose.Types.ObjectId().toString();

  try {
    await service.logAdminIncident(
      {
        shipmentId: new mongoose.Types.ObjectId().toString(),
        reason: IncidentReason.DAMAGED,
        comment: "Package was damaged.",
      },
      companyId,
      driverId,
      "DRIVER"
    );

    assert.fail("Should have thrown IncidentError for role violation");
  } catch (error: any) {
    assert.ok(error instanceof IncidentError);
    assert.equal(error.code, IncidentErrorCode.ROLE_FORBIDDEN);
    assert.equal(error.statusCode, 403);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Multi-tenant isolation — cross-company shipment access denied
// ═══════════════════════════════════════════════════════════════════════════════

test("multi-tenant isolation: shipment from different company is rejected", async () => {
  const service = new IncidentService();
  const companyA = new mongoose.Types.ObjectId().toString();
  const driverId = new mongoose.Types.ObjectId().toString();

  const originalShipmentFindOne = Shipment.findOne;
  // Simulate Shipment.findOne returning null (shipment belongs to company B)
  (Shipment as any).findOne = async () => null;

  try {
    await service.logDriverIncident(
      {
        shipmentId: new mongoose.Types.ObjectId().toString(),
        reason: IncidentReason.NO_ANSWER,
        comment: "Testing cross-company access.",
        driverLat: 30.0,
        driverLng: 31.0,
        proofImage: "https://storage.example.com/proof/test.jpg",
      },
      companyA,
      driverId,
      "DRIVER"
    );

    assert.fail("Should have thrown SHIPMENT_NOT_FOUND error");
  } catch (error: any) {
    assert.ok(error instanceof IncidentError);
    assert.equal(error.code, IncidentErrorCode.SHIPMENT_NOT_FOUND);
    assert.equal(error.statusCode, 404);
  } finally {
    (Shipment as any).findOne = originalShipmentFindOne;
  }
});
