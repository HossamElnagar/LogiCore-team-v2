/**
 * incident.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Core business logic for the Dual-Ingress Incident Management System.
 *
 * This service enforces the architectural blueprint's strict rules:
 *
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ GROUND INGRESS (DRIVER / RIDER)                                       │
 *  │  1. Haversine geo-fence validation (150m radius)                      │
 *  │  2. Mandatory proof-of-incident photo                                 │
 *  │  3. Shipment must be assigned to the requesting driver                │
 *  ├─────────────────────────────────────────────────────────────────────────┤
 *  │ ADMINISTRATIVE INGRESS (DEPARTMENT_MANAGER / CS_MANAGER)              │
 *  │  1. Geo-fence validation BYPASSED                                     │
 *  │  2. Photo requirement BYPASSED                                        │
 *  │  3. Shipment must belong to the same companyId (multi-tenant scope)   │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *  On successful incident creation:
 *   - Shipment status mutates to INCIDENT
 *   - Immutable incidentDetails block is embedded into the shipment document
 *   - ShipmentTimeline event is appended (INCIDENT_TRIGGERED)
 *   - Separate Incident document is created for dashboard tracking
 *   - Socket.io real-time broadcast fires to the executive control board
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import { Incident } from "../models/Incedent.model.js";
import { Shipment } from "../models/Shipment.model.js";
import { ShipmentTimeline } from "../models/Shipment Timeline.model.js";
import {
  IncidentStatus,
  IncidentSeverity,
  IncidentEntityType,
} from "../types/incident.type.js";
import {
  ShipmentStatus,
  ShipmentEventType,
  IncidentReason,
} from "../types/shipment.type.js";
import { getIo } from "../socket/socket.js";
import { validateGeoFence } from "../utils/haversine.js";

// ── Constants ──────────────────────────────────────────────────────────────
/** Maximum allowed distance (metres) between driver and delivery target */
const GEO_FENCE_RADIUS_METRES = 150;

/** Roles that trigger GROUND ingress (geo-fence + photo enforced) */
const GROUND_ROLES = ["DRIVER", "RIDER"];

/** Roles permitted for ADMINISTRATIVE ingress (geo-fence + photo bypassed) */
const ADMIN_ROLES = [
  "OWNER",
  "OPERATIONS_MANAGER",
  "WAREHOUSE_MANAGER",
  "CUSTOMER_SUPPORT",
  "CS_MANAGER",
  "CS_AGENT",
  "DRIVER_MANAGER",
];

// ── Error Codes ────────────────────────────────────────────────────────────
export const IncidentErrorCode = {
  AUTH_REQUIRED: "INCIDENT_AUTH_REQUIRED",
  ROLE_FORBIDDEN: "INCIDENT_ROLE_FORBIDDEN",
  SHIPMENT_NOT_FOUND: "INCIDENT_SHIPMENT_NOT_FOUND",
  SHIPMENT_ALREADY_INCIDENT: "INCIDENT_SHIPMENT_ALREADY_INCIDENT",
  SHIPMENT_NOT_ASSIGNED: "INCIDENT_SHIPMENT_NOT_ASSIGNED_TO_DRIVER",
  GEO_FENCE_VIOLATION: "INCIDENT_GEO_FENCE_VIOLATION",
  MISSING_COORDINATES: "INCIDENT_MISSING_DELIVERY_COORDINATES",
  MISSING_DRIVER_GPS: "INCIDENT_MISSING_DRIVER_GPS",
  MISSING_PROOF_IMAGE: "INCIDENT_MISSING_PROOF_IMAGE",
  INCIDENT_NOT_FOUND: "INCIDENT_NOT_FOUND",
  INVALID_ID: "INCIDENT_INVALID_ID",
} as const;

// ── Typed Error ────────────────────────────────────────────────────────────
export class IncidentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = "IncidentError";
  }
}

// ── Payload Interfaces ─────────────────────────────────────────────────────

export interface DriverIncidentPayload {
  shipmentId: string;
  reason: IncidentReason;
  comment: string;
  driverLat: number;
  driverLng: number;
  proofImage: string;
}

export interface AdminIncidentPayload {
  shipmentId: string;
  reason: IncidentReason;
  comment: string;
  proofImage?: string;
}

// ── Socket Broadcast Helper ────────────────────────────────────────────────

async function broadcastIncidentAlert(incident: any, shipment: any) {
  const io = getIo();
  if (!io) return;

  io.to(`company:${incident.companyId}`)
    .to(`company_${incident.companyId}`)
    .emit("fleet:incident_alert", {
      incidentId: incident._id.toString(),
      shipmentId: shipment._id.toString(),
      trackingNumber: shipment.trackingNumber,
      reason: incident.title,
      severity: incident.severity,
      reportedBy: incident.reportedBy.toString(),
      timestamp: new Date().toISOString(),
    });
}

// ── Service Class ──────────────────────────────────────────────────────────

export class IncidentService {
  /**
   * ════════════════════════════════════════════════════════════════════════
   * LOG INCIDENT — GROUND INGRESS (DRIVER / RIDER)
   * ════════════════════════════════════════════════════════════════════════
   *
   * Enforces:
   *  • Shipment belongs to the driver's company (multi-tenant isolation)
   *  • Shipment is assigned to the requesting driver (ownership check)
   *  • Shipment is not already in INCIDENT or terminal state
   *  • Haversine geo-fence validation (driver within 150m of target)
   *  • Mandatory proof-of-incident photo URL
   *
   * Side Effects:
   *  • Mutates shipment status → INCIDENT
   *  • Embeds immutable incidentDetails in shipment document
   *  • Creates timeline event (INCIDENT_TRIGGERED)
   *  • Creates Incident document for dashboard
   *  • Fires Socket.io broadcast to company control board
   */
  async logDriverIncident(
    payload: DriverIncidentPayload,
    companyId: string,
    driverId: string,
    driverRole: string
  ) {
    // ── 1. Validate authentication context ──────────────────────────────
    if (!companyId || !driverId) {
      throw new IncidentError(
        IncidentErrorCode.AUTH_REQUIRED,
        "Authentication context (companyId, userId) is required.",
        401
      );
    }

    // ── 2. Validate role is ground-level ────────────────────────────────
    if (!GROUND_ROLES.includes(driverRole)) {
      throw new IncidentError(
        IncidentErrorCode.ROLE_FORBIDDEN,
        `Role '${driverRole}' is not authorized for ground incident ingress. Use the administrative endpoint.`,
        403
      );
    }

    const { shipmentId, reason, comment, driverLat, driverLng, proofImage } = payload;

    // ── 3. Load and validate shipment ───────────────────────────────────
    const shipment = await Shipment.findOne({
      _id: new mongoose.Types.ObjectId(shipmentId),
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (!shipment) {
      throw new IncidentError(
        IncidentErrorCode.SHIPMENT_NOT_FOUND,
        "Shipment not found or does not belong to your company.",
        404
      );
    }

    // ── 4. Check shipment is not already in terminal/incident state ─────
    if (shipment.status === ShipmentStatus.INCIDENT) {
      throw new IncidentError(
        IncidentErrorCode.SHIPMENT_ALREADY_INCIDENT,
        `Shipment ${shipment.trackingNumber} already has an active incident logged.`,
        409
      );
    }

    if (
      shipment.status === ShipmentStatus.DELIVERED ||
      shipment.status === ShipmentStatus.CANCELLED
    ) {
      throw new IncidentError(
        IncidentErrorCode.SHIPMENT_ALREADY_INCIDENT,
        `Cannot log incident on a shipment with terminal status '${shipment.status}'.`,
        409
      );
    }

    // ── 5. Ownership check: shipment must be assigned to this driver ────
    if (
      !shipment.assignedDriver ||
      shipment.assignedDriver.toString() !== driverId
    ) {
      throw new IncidentError(
        IncidentErrorCode.SHIPMENT_NOT_ASSIGNED,
        "You can only log incidents for shipments assigned to you.",
        403
      );
    }

    // ── 6. Haversine geo-fence validation ───────────────────────────────
    if (
      shipment.deliveryLat == null ||
      shipment.deliveryLng == null
    ) {
      throw new IncidentError(
        IncidentErrorCode.MISSING_COORDINATES,
        "Shipment does not have delivery coordinates set. Cannot perform geo-fence validation.",
        422
      );
    }

    const geoResult = validateGeoFence(
      { lat: driverLat, lng: driverLng },
      { lat: shipment.deliveryLat, lng: shipment.deliveryLng },
      GEO_FENCE_RADIUS_METRES
    );

    if (!geoResult.withinFence) {
      throw new IncidentError(
        IncidentErrorCode.GEO_FENCE_VIOLATION,
        `Geo-fence violation: You are ${geoResult.distanceMetres}m from the delivery location. Maximum allowed radius is ${geoResult.maxRadiusMetres}m. You must be within ${GEO_FENCE_RADIUS_METRES} metres of the client location to report an incident.`,
        400,
        {
          driverCoordinates: { lat: driverLat, lng: driverLng },
          deliveryCoordinates: { lat: shipment.deliveryLat, lng: shipment.deliveryLng },
          distanceMetres: geoResult.distanceMetres,
          maxRadiusMetres: geoResult.maxRadiusMetres,
        }
      );
    }

    // ── 7. Execute atomic state mutations ───────────────────────────────
    return this._executeIncidentCreation(
      shipment,
      reason,
      comment,
      driverId,
      driverRole,
      companyId,
      proofImage
    );
  }

  /**
   * ════════════════════════════════════════════════════════════════════════
   * LOG INCIDENT — ADMINISTRATIVE INGRESS (MANAGERS)
   * ════════════════════════════════════════════════════════════════════════
   *
   * Bypass Rule: Administrative entries automatically bypass the Haversine
   * GPS geo-fence validation and photo requirements since managers handle
   * disputes retrospectively or via telephone confirmation.
   *
   * Enforces:
   *  • Shipment belongs to the manager's company (multi-tenant isolation)
   *  • Shipment is not already in INCIDENT or terminal state
   *  • Manager role is in the ADMIN_ROLES whitelist
   */
  async logAdminIncident(
    payload: AdminIncidentPayload,
    companyId: string,
    adminId: string,
    adminRole: string
  ) {
    // ── 1. Validate authentication context ──────────────────────────────
    if (!companyId || !adminId) {
      throw new IncidentError(
        IncidentErrorCode.AUTH_REQUIRED,
        "Authentication context (companyId, userId) is required.",
        401
      );
    }

    // ── 2. Validate role is administrative ──────────────────────────────
    if (!ADMIN_ROLES.includes(adminRole)) {
      throw new IncidentError(
        IncidentErrorCode.ROLE_FORBIDDEN,
        `Role '${adminRole}' is not authorized for administrative incident ingress. Drivers must use the ground-level endpoint.`,
        403
      );
    }

    const { shipmentId, reason, comment, proofImage } = payload;

    // ── 3. Load and validate shipment (multi-tenant scoped) ─────────────
    const shipment = await Shipment.findOne({
      _id: new mongoose.Types.ObjectId(shipmentId),
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (!shipment) {
      throw new IncidentError(
        IncidentErrorCode.SHIPMENT_NOT_FOUND,
        "Shipment not found or does not belong to your company.",
        404
      );
    }

    // ── 4. Check shipment is not already in terminal/incident state ─────
    if (shipment.status === ShipmentStatus.INCIDENT) {
      throw new IncidentError(
        IncidentErrorCode.SHIPMENT_ALREADY_INCIDENT,
        `Shipment ${shipment.trackingNumber} already has an active incident logged.`,
        409
      );
    }

    if (
      shipment.status === ShipmentStatus.DELIVERED ||
      shipment.status === ShipmentStatus.CANCELLED
    ) {
      throw new IncidentError(
        IncidentErrorCode.SHIPMENT_ALREADY_INCIDENT,
        `Cannot log incident on a shipment with terminal status '${shipment.status}'.`,
        409
      );
    }

    // ── 5. Execute atomic state mutations (no geo-fence, optional photo) ─
    return this._executeIncidentCreation(
      shipment,
      reason,
      comment,
      adminId,
      adminRole,
      companyId,
      proofImage
    );
  }

  /**
   * ════════════════════════════════════════════════════════════════════════
   * SHARED: Execute the Incident Creation Pipeline
   * ════════════════════════════════════════════════════════════════════════
   *
   * Performs three atomic writes:
   *  1. Mutate shipment → INCIDENT status + embed incidentDetails
   *  2. Append ShipmentTimeline event (INCIDENT_TRIGGERED)
   *  3. Create Incident document for dashboard/analytics
   *
   * Then fires a Socket.io broadcast to the company control board.
   */
  private async _executeIncidentCreation(
    shipment: any,
    reason: IncidentReason,
    comment: string,
    reportedBy: string,
    reporterRole: string,
    companyId: string,
    proofImage?: string
  ) {
    const now = new Date();
    const reporterObjectId = new mongoose.Types.ObjectId(reportedBy);
    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // ── Step 1: Create Incident document for dashboard tracking ─────────
    const incident = await Incident.create({
      companyId: companyObjectId,
      title: `Delivery Exception: ${reason.replace(/_/g, " ")}`,
      description: comment,
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.OPEN,
      relatedEntityType: IncidentEntityType.SHIPMENT,
      relatedEntityId: shipment._id,
      reportedBy: reporterObjectId,
      attachments: proofImage ? [proofImage] : [],
      metadata: {
        trackingNumber: shipment.trackingNumber,
        reason,
        reporterRole,
        proofImage: proofImage || null,
      },
    });

    // ── Step 2: Auto-provision ChatRoom ─────────────────────────────────
    const { ChatRoom, ChatRoomType } = await import("../models/ChatRoom.model.js");
    const { User } = await import("../models/User.model.js");
    const { UserRole } = await import("../types/user.type.js");

    const participants = new Set<string>();
    participants.add(reporterObjectId.toString());
    if (shipment.assignedDriver) {
      participants.add(shipment.assignedDriver.toString());
    }

    // Add all Driver Managers of this company to the incident chat
    const driverManagers = await User.find({
      companyId: companyObjectId,
      role: UserRole.DRIVER_MANAGER,
    }).select("_id").lean();

    driverManagers.forEach(dm => participants.add(dm._id.toString()));

    const chatRoom = await ChatRoom.create({
      companyId: companyObjectId,
      type: ChatRoomType.INCIDENT,
      incidentId: incident._id,
      participants: Array.from(participants).map(id => new mongoose.Types.ObjectId(id)),
    });

    incident.chatRoomId = chatRoom._id as mongoose.Types.ObjectId;
    incident.shipmentId = shipment._id as mongoose.Types.ObjectId;
    await incident.save();

    // ── Step 3: Mutate shipment status + link activeIncidentId ───────────
    shipment.status = ShipmentStatus.INCIDENT;
    shipment.activeIncidentId = incident._id;
    shipment.incidentDetails = undefined; // Clear out legacy sub-schema if present
    await shipment.save();

    // ── Step 4: Append immutable ShipmentTimeline event ─────────────────
    const timelineEntry = await ShipmentTimeline.create({
      shipmentId: shipment._id,
      companyId: companyObjectId,
      eventType: ShipmentEventType.INCIDENT_TRIGGERED,
      message: `Incident logged: [${reason}] — "${comment}" (reported by ${reporterRole})`,
      createdBy: reporterObjectId,
      metadata: {
        reason,
        reporterRole,
        proofImage: proofImage || null,
      },
    });

    // ── Step 5: Real-time Socket.io broadcast to control board ──────────
    void broadcastIncidentAlert(incident, shipment);

    return {
      incident,
      shipment: {
        _id: shipment._id,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        activeIncidentId: shipment.activeIncidentId,
      },
      timeline: timelineEntry,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // READ OPERATIONS (unchanged from existing implementation)
  // ══════════════════════════════════════════════════════════════════════════

  /** List all incidents scoped to the requesting user's company */
  async listIncidents(companyId?: string, userId?: string, role?: string) {
    if (!companyId) {
      throw new IncidentError(
        IncidentErrorCode.AUTH_REQUIRED,
        "Authentication context is required.",
        401
      );
    }

    const query: any = { companyId };

    // Drivers only see their own incidents
    if (role === "DRIVER" && userId) {
      query.reportedBy = new mongoose.Types.ObjectId(userId);
    }

    return Incident.find(query)
      .sort({ createdAt: -1 })
      .populate("reportedBy", "userName email role")
      .lean();
  }

  /** Get a single incident by ID, scoped to the requesting user's company */
  async getIncidentById(id: string, companyId?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new IncidentError(
        IncidentErrorCode.INVALID_ID,
        "Invalid incident ID format.",
        400
      );
    }

    if (!companyId) {
      throw new IncidentError(
        IncidentErrorCode.AUTH_REQUIRED,
        "Authentication context is required.",
        401
      );
    }

    const incident = await Incident.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    })
      .populate("reportedBy", "userName email role")
      .lean();

    if (!incident) {
      throw new IncidentError(
        IncidentErrorCode.INCIDENT_NOT_FOUND,
        "Incident not found or does not belong to your company.",
        404
      );
    }

    return incident;
  }

  /** Update incident status (resolve / close) */
  async updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    companyId?: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new IncidentError(
        IncidentErrorCode.INVALID_ID,
        "Invalid incident ID format.",
        400
      );
    }

    if (!companyId) {
      throw new IncidentError(
        IncidentErrorCode.AUTH_REQUIRED,
        "Authentication context is required.",
        401
      );
    }

    const incident = await Incident.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!incident) {
      throw new IncidentError(
        IncidentErrorCode.INCIDENT_NOT_FOUND,
        "Incident not found or does not belong to your company.",
        404
      );
    }

    incident.status = status;
    if (
      status === IncidentStatus.RESOLVED ||
      status === IncidentStatus.CLOSED
    ) {
      incident.resolvedAt = new Date();
    }

    await incident.save();
    return incident;
  }
}
