import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { Shipment } from "../src/models/Shipment.model.js";
import { ShipmentStatus } from "../src/types/shipment.type.js";
import { generateOtp, verifyOtp } from "../src/services/shipment/otp.service.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockShipmentBase(overrides: Record<string, unknown> = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    trackingNumber: "TRK-TEST-001",
    customerName: "Test Customer",
    customerPhone: "01000000000",
    pickupAddress: "Cairo Hub",
    deliveryAddress: "Alexandria",
    status: ShipmentStatus.OUT_FOR_DELIVERY,
    deliveryOtp: "0000",
    deliveryOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    deliveryOtpAttempts: 0,
    save: async () => undefined,
    ...overrides,
  };
}

// ── Test: generateOtp writes code + expiry to the database ───────────────────

test("generateOtp stores a 4-digit code with 5-minute expiry on the shipment", async () => {
  const shipmentId = new mongoose.Types.ObjectId().toString();
  const updates: Record<string, unknown> = {};

  const originalUpdate = Shipment.findByIdAndUpdate;
  (Shipment as any).findByIdAndUpdate = async (_id: unknown, data: Record<string, unknown>) => {
    Object.assign(updates, data);
    return null;
  };

  try {
    const code = await generateOtp(shipmentId);

    // Code must be exactly 4 digits
    assert.match(code, /^\d{4}$/, "OTP must be a 4-digit string");

    // Stored code must match returned code
    assert.equal(updates.deliveryOtp, code, "Stored OTP must equal the returned code");

    // Expiry must be approximately 5 minutes in the future (within 10-second tolerance)
    const expiry = updates.deliveryOtpExpiresAt as Date;
    const expectedExpiry = new Date(Date.now() + 5 * 60 * 1000);
    assert.ok(
      Math.abs(expiry.getTime() - expectedExpiry.getTime()) < 10_000,
      "OTP expiry must be ~5 minutes from now"
    );

    // Attempts must be reset to 0
    assert.equal(updates.deliveryOtpAttempts, 0, "Attempts must be reset on generation");
  } finally {
    (Shipment as any).findByIdAndUpdate = originalUpdate;
  }
});

// ── Test: verifyOtp accepts the correct code ──────────────────────────────────

test("verifyOtp resolves without error when the correct code is submitted", async () => {
  const shipment = mockShipmentBase({ deliveryOtp: "4321", deliveryOtpAttempts: 0 });
  const shipmentId = shipment._id.toString();

  const originalFindById = Shipment.findById;
  const originalUpdate = Shipment.findByIdAndUpdate;

  (Shipment as any).findById = (_id: unknown) => ({
    select: (_fields: unknown) => ({
      exec: async () => shipment,
    }),
  });

  (Shipment as any).findByIdAndUpdate = async () => null;

  try {
    await assert.doesNotReject(
      () => verifyOtp(shipmentId, "4321"),
      "Correct OTP should resolve without error"
    );
  } finally {
    (Shipment as any).findById = originalFindById;
    (Shipment as any).findByIdAndUpdate = originalUpdate;
  }
});

// ── Test: verifyOtp rejects incorrect codes with remaining attempts ────────────

test("verifyOtp throws with remaining-attempts message on wrong code", async () => {
  const shipment = mockShipmentBase({ deliveryOtp: "9999", deliveryOtpAttempts: 0 });
  const shipmentId = shipment._id.toString();

  const originalFindById = Shipment.findById;
  (Shipment as any).findById = (_id: unknown) => ({
    select: (_fields: unknown) => ({
      exec: async () => shipment,
    }),
  });

  try {
    await assert.rejects(
      () => verifyOtp(shipmentId, "1234"),
      (err: Error) => {
        assert.ok(err.message.includes("Incorrect OTP"), `Expected "Incorrect OTP" in: ${err.message}`);
        return true;
      }
    );
  } finally {
    (Shipment as any).findById = originalFindById;
  }
});

// ── Test: verifyOtp rejects after max attempts ────────────────────────────────

test("verifyOtp throws rate-limit error after 3 failed attempts", async () => {
  // Simulate a shipment that has already exhausted its 3 attempts
  const shipment = mockShipmentBase({
    deliveryOtp: "5555",
    deliveryOtpAttempts: 3, // already at max
  });
  const shipmentId = shipment._id.toString();

  const originalFindById = Shipment.findById;
  (Shipment as any).findById = (_id: unknown) => ({
    select: (_fields: unknown) => ({
      exec: async () => shipment,
    }),
  });

  try {
    await assert.rejects(
      () => verifyOtp(shipmentId, "5555"),
      (err: Error) => {
        assert.ok(
          err.message.includes("Too many failed attempts") || err.message.includes("locked"),
          `Expected lock message in: ${err.message}`
        );
        return true;
      }
    );
  } finally {
    (Shipment as any).findById = originalFindById;
  }
});

// ── Test: verifyOtp rejects expired codes ────────────────────────────────────

test("verifyOtp throws expiry error when OTP TTL has elapsed", async () => {
  const shipment = mockShipmentBase({
    deliveryOtp: "7777",
    deliveryOtpExpiresAt: new Date(Date.now() - 1_000), // expired 1 second ago
    deliveryOtpAttempts: 0,
  });
  const shipmentId = shipment._id.toString();

  const originalFindById = Shipment.findById;
  (Shipment as any).findById = (_id: unknown) => ({
    select: (_fields: unknown) => ({
      exec: async () => shipment,
    }),
  });

  try {
    await assert.rejects(
      () => verifyOtp(shipmentId, "7777"),
      (err: Error) => {
        assert.ok(err.message.includes("expired"), `Expected "expired" in: ${err.message}`);
        return true;
      }
    );
  } finally {
    (Shipment as any).findById = originalFindById;
  }
});

// ── Test: verifyOtp rejects when no OTP has been generated ───────────────────

test("verifyOtp throws when no OTP has been generated for the shipment", async () => {
  const shipment = mockShipmentBase({
    deliveryOtp: undefined,
    deliveryOtpExpiresAt: undefined,
  });
  const shipmentId = shipment._id.toString();

  const originalFindById = Shipment.findById;
  (Shipment as any).findById = (_id: unknown) => ({
    select: (_fields: unknown) => ({
      exec: async () => shipment,
    }),
  });

  try {
    await assert.rejects(
      () => verifyOtp(shipmentId, "1234"),
      (err: Error) => {
        assert.ok(
          err.message.includes("No OTP"),
          `Expected "No OTP" message in: ${err.message}`
        );
        return true;
      }
    );
  } finally {
    (Shipment as any).findById = originalFindById;
  }
});
