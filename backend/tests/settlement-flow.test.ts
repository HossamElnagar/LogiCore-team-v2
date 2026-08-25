import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { Settlement, SettlementStatus } from "../src/models/Settlement.model.js";
import { Shipment } from "../src/models/Shipment.model.js";
import { User } from "../src/models/User.model.js";
import { SettlementService } from "../src/services/settlement/settlement.service.js";
import { ShipmentStatus, PaymentMethod } from "../src/types/shipment.type.js";
import { UserRole, AuthProvider } from "../src/types/user.type.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const companyId = new mongoose.Types.ObjectId();
const driverId = new mongoose.Types.ObjectId();
const managerId = new mongoose.Types.ObjectId();

function mockDriver(overrides: Record<string, unknown> = {}) {
  return {
    _id: driverId,
    companyId,
    userName: "Test Driver",
    email: "driver@test.com",
    phone: "01000000000",
    role: UserRole.DRIVER,
    authProvider: AuthProvider.LOCAL,
    unreconciledCash: 500,
    isOnline: false,
    ...overrides,
  };
}

// ── Test: reconcile calculates expectedCash from COD deliveries ───────────────

test("reconcile calculates expectedCash from COD deliveries and stores the settlement", async () => {
  const service = new SettlementService();

  // Mock User.findOne (driver verification)
  const origUserFindOne = User.findOne;
  (User as any).findOne = () => ({ lean: async () => mockDriver() });

  // Mock Shipment.aggregate (COD sum = 750)
  const origShipmentAggregate = Shipment.aggregate;
  (Shipment as any).aggregate = async () => [{ total: 750 }];

  // Mock Settlement.findOneAndUpdate (upsert)
  let savedDoc: Record<string, unknown> = {};
  const origSettlementUpdate = Settlement.findOneAndUpdate;
  (Settlement as any).findOneAndUpdate = async (
    _filter: unknown,
    doc: Record<string, unknown>
  ) => {
    savedDoc = doc;
    return {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      createdAt: new Date(),
    };
  };

  // Mock User.findByIdAndUpdate (reset float)
  const origUserUpdate = User.findByIdAndUpdate;
  let driverCashReset = false;
  (User as any).findByIdAndUpdate = async () => { driverCashReset = true; };

  try {
    const result = await service.reconcile(
      { driverId: driverId.toString(), collectedCash: 700 },
      managerId.toString(),
      companyId.toString()
    );

    assert.equal(savedDoc.expectedCash, 750, "expectedCash must equal the COD aggregate");
    assert.equal(savedDoc.collectedCash, 700, "collectedCash must equal submitted value");
    assert.equal(
      savedDoc.discrepancyAmount,
      -50,
      "discrepancy = collected − expected = −50"
    );
    assert.equal(savedDoc.status, SettlementStatus.RECONCILED);
    assert.ok(driverCashReset, "driver unreconciledCash should be reset");
    assert.equal(result.expectedCash, 750);
    assert.equal(result.discrepancyAmount, -50);
  } finally {
    (User as any).findOne = origUserFindOne;
    (Shipment as any).aggregate = origShipmentAggregate;
    (Settlement as any).findOneAndUpdate = origSettlementUpdate;
    (User as any).findByIdAndUpdate = origUserUpdate;
  }
});

// ── Test: reconcile rejects unknown driver ────────────────────────────────────

test("reconcile throws when driver is not found in the company", async () => {
  const service = new SettlementService();

  const origUserFindOne = User.findOne;
  (User as any).findOne = () => ({ lean: async () => null });

  try {
    await assert.rejects(
      () =>
        service.reconcile(
          { driverId: driverId.toString(), collectedCash: 100 },
          managerId.toString(),
          companyId.toString()
        ),
      (err: Error) => {
        assert.ok(
          err.message.includes("not found"),
          `Expected "not found" in: ${err.message}`
        );
        return true;
      }
    );
  } finally {
    (User as any).findOne = origUserFindOne;
  }
});

// ── Test: reconcile rejects negative cash ─────────────────────────────────────

test("reconcile throws for negative collectedCash", async () => {
  const service = new SettlementService();

  await assert.rejects(
    () =>
      service.reconcile(
        { driverId: driverId.toString(), collectedCash: -10 },
        managerId.toString(),
        companyId.toString()
      ),
    (err: Error) => {
      assert.ok(
        err.message.includes("non-negative"),
        `Expected "non-negative" in: ${err.message}`
      );
      return true;
    }
  );
});

// ── Test: getTodaySummary aggregates correctly ────────────────────────────────

test("getTodaySummary returns correct totals from aggregation pipeline", async () => {
  const service = new SettlementService();

  const origShipmentAggregate = Shipment.aggregate;
  const origSettlementAggregate = Settlement.aggregate;

  // Expected COD deliveries today = 1200
  (Shipment as any).aggregate = async () => [{ total: 1200 }];
  // Reconciled today = 1100 from 3 drivers
  (Settlement as any).aggregate = async () => [{ totalCollected: 1100, count: 3 }];

  try {
    const summary = await service.getTodaySummary(companyId.toString());

    assert.equal(summary.totalExpected, 1200);
    assert.equal(summary.totalCollected, 1100);
    assert.equal(summary.discrepancy, -100);
    assert.equal(summary.reconciledDriversCount, 3);
  } finally {
    (Shipment as any).aggregate = origShipmentAggregate;
    (Settlement as any).aggregate = origSettlementAggregate;
  }
});

// ── Test: getDriverStatement respects tenant boundary ─────────────────────────

test("getDriverStatement throws when driver belongs to a different company", async () => {
  const service = new SettlementService();

  const origUserFindOne = User.findOne;
  // Return null to simulate driver not in this company
  (User as any).findOne = () => ({
    select: () => ({ lean: async () => null }),
  });

  try {
    await assert.rejects(
      () =>
        service.getDriverStatement(
          driverId.toString(),
          companyId.toString()
        ),
      (err: Error) => {
        assert.ok(
          err.message.includes("not found"),
          `Expected tenant isolation error, got: ${err.message}`
        );
        return true;
      }
    );
  } finally {
    (User as any).findOne = origUserFindOne;
  }
});
