import test from "node:test";
import assert from "node:assert/strict";
import { AnalyticsService } from "../src/services/analytics.service.js";
import { Shipment } from "../src/models/Shipment.model.js";
import { Incident } from "../src/models/Incedent.model.js";
import { SettlementService } from "../src/services/settlement/settlement.service.js";

test("getDashboardMetrics includes manager dashboard summary", async () => {
  const service = new AnalyticsService();
  const companyId = "507f1f77bcf86cd799439011";

  const originalShipmentCountDocuments = Shipment.countDocuments;
  const originalShipmentAggregate = Shipment.aggregate;
  const originalShipmentFind = Shipment.find;
  const originalIncidentCountDocuments = Incident.countDocuments;
  const originalIncidentAggregate = Incident.aggregate;
  const originalIncidentFind = Incident.find;
  const originalGetTodaySummary = SettlementService.prototype.getTodaySummary;

  try {
    (Shipment as any).countDocuments = async (query: any) => {
      if (query?.status?.$in) return 4;
      if (query?.status === "DELIVERED") return 2;
      return 10;
    };

    (Shipment as any).aggregate = async () => [{ _id: "ASSIGNED", count: 3 }];
    (Shipment as any).find = () => ({
      sort: () => ({
        limit: () => ({
          select: () => ({
            lean: async () => [{ trackingNumber: "T-100" }],
          }),
        }),
      }),
    });

    (Incident as any).countDocuments = async (query: any) => {
      if (query?.status === "OPEN") return 3;
      if (query?.$or) return 2;
      return 0;
    };

    (Incident as any).aggregate = async () => [{ _id: "HIGH", count: 2 }];
    (Incident as any).find = () => ({
      sort: () => ({
        limit: () => ({
          select: () => ({
            lean: async () => [{ title: "Delayed delivery" }],
          }),
        }),
      }),
    });

    SettlementService.prototype.getTodaySummary = async () => ({
      totalExpected: 1000,
      totalCollected: 900,
      discrepancy: -100,
      reconciledDriversCount: 1,
    });

    const result = await service.getDashboardMetrics(companyId);

    assert.equal(result.managerDashboard.openIncidents, 3);
    assert.equal(result.managerDashboard.escalatedIncidents, 2);
    assert.equal(result.managerDashboard.notificationCount, 5);
  } finally {
    (Shipment as any).countDocuments = originalShipmentCountDocuments;
    (Shipment as any).aggregate = originalShipmentAggregate;
    (Shipment as any).find = originalShipmentFind;
    (Incident as any).countDocuments = originalIncidentCountDocuments;
    (Incident as any).aggregate = originalIncidentAggregate;
    (Incident as any).find = originalIncidentFind;
    SettlementService.prototype.getTodaySummary = originalGetTodaySummary;
  }
});
