import mongoose from "mongoose";
import { Shipment } from "../models/Shipment.model.js";
import { Incident } from "../models/Incedent.model.js";
import { ShipmentStatus } from "../types/shipment.type.js";
import { IncidentStatus } from "../types/incident.type.js";
import { SettlementService } from "./settlement/settlement.service.js";

const settlementService = new SettlementService();

/** Active statuses — shipments that are moving but not yet closed */
const ACTIVE_STATUSES = [
  ShipmentStatus.ASSIGNED,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.ARRIVED_HUB,
  ShipmentStatus.OUT_FOR_DELIVERY,
];

export class AnalyticsService {
  async getDashboardMetrics(companyId?: string) {
    if (!companyId) {
      throw new Error("Authentication context is required");
    }

    const objectId = new mongoose.Types.ObjectId(companyId);

    // Run all heavy queries in parallel for minimum latency
    const [
      totalShipments,
      activeShipments,
      shipmentsByStatus,
      deliveredCount,
      openIncidents,
      escalatedIncidents,
      incidentsBySeverity,
      recentShipments,
      recentIncidents,
      cashSummary,
    ] = await Promise.all([
      // Total shipments
      Shipment.countDocuments({ companyId: objectId }),

      // Active (in-flight) shipments
      Shipment.countDocuments({
        companyId: objectId,
        status: { $in: ACTIVE_STATUSES },
      }),

      // Shipments by status breakdown
      Shipment.aggregate([
        { $match: { companyId: objectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Delivered count
      Shipment.countDocuments({
        companyId: objectId,
        status: ShipmentStatus.DELIVERED,
      }),

      // Open incidents
      Incident.countDocuments({
        companyId: objectId,
        status: IncidentStatus.OPEN,
      }),

      // Escalated incidents that need manager attention
      Incident.countDocuments({
        companyId: objectId,
        $or: [
          { status: IncidentStatus.IN_PROGRESS },
          { escalatedByManager: true },
        ],
      }),

      // Incidents by severity
      Incident.aggregate([
        { $match: { companyId: objectId } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Recent shipments (last 5)
      Shipment.find({ companyId: objectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("trackingNumber customerName status createdAt")
        .lean(),

      // Recent incidents (last 5)
      Incident.find({ companyId: objectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title status severity createdAt")
        .lean(),

      // Today's cash reconciliation summary
      settlementService.getTodaySummary(companyId),
    ]);

    return {
      shipmentMetrics: {
        total: totalShipments,
        active: activeShipments,
        delivered: deliveredCount,
        byStatus: shipmentsByStatus.map((item) => ({
          status: item._id,
          count: item.count,
          percentage: Math.round((item.count / totalShipments) * 100) || 0,
        })),
      },
      incidentMetrics: {
        openCount: openIncidents,
        bySeverity: incidentsBySeverity.map((item) => ({
          severity: item._id,
          count: item.count,
        })),
      },
      managerDashboard: {
        openIncidents: openIncidents,
        escalatedIncidents: escalatedIncidents,
        notificationCount: openIncidents + escalatedIncidents,
      },
      cashMetrics: cashSummary,
      recentActivity: {
        shipments: recentShipments,
        incidents: recentIncidents,
      },
    };
  }
}

