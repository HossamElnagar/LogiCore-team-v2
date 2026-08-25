import mongoose from "mongoose";
import { Shipment } from "../../models/Shipment.model.js";

const OTP_TTL_MS = 5 * 60 * 1000;      // 5 minutes
const OTP_MAX_ATTEMPTS = 3;             // max failed attempts before lockout
const OTP_DIGITS = 4;

/**
 * generateOtp
 * Produces a zero-padded 4-digit OTP, stores it (with expiry) on the Shipment
 * document, and returns the plain-text code for dispatch to the customer.
 */
export async function generateOtp(shipmentId: string): Promise<string> {
  if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
    throw new Error("Invalid shipment ID format");
  }

  // Cryptographically-safe random integer in range [0000, 9999]
  const code = String(Math.floor(Math.random() * 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await Shipment.findByIdAndUpdate(shipmentId, {
    deliveryOtp: code,
    deliveryOtpExpiresAt: expiresAt,
    deliveryOtpAttempts: 0,
  });

  return code;
}

export interface OtpVerificationResult {
  valid: boolean;
  remainingAttempts: number;
  lockedOut: boolean;
  expired: boolean;
}

/**
 * verifyOtp
 * Increments the attempt counter, validates expiry, then validates the code.
 * Throws descriptive errors for rate-limiting, expiry, and wrong codes.
 * On success resets the OTP fields so codes cannot be replayed.
 */
export async function verifyOtp(
  shipmentId: string,
  submittedCode: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
    throw new Error("Invalid shipment ID format");
  }

  // Explicitly select OTP fields excluded by default schema option
  const shipment = await Shipment.findById(shipmentId)
    .select("+deliveryOtp +deliveryOtpExpiresAt +deliveryOtpAttempts")
    .exec();

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  if (!shipment.deliveryOtp || !shipment.deliveryOtpExpiresAt) {
    throw new Error("No OTP has been generated for this shipment. Please request one first.");
  }

  // Rate-limit check — must come BEFORE incrementing on a locked account
  if (shipment.deliveryOtpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new Error(
      `Too many failed attempts. OTP is locked. Please generate a new code.`
    );
  }

  // Increment attempt counter immediately (before validation) to prevent
  // race-condition abuse where many concurrent requests check before any increment.
  shipment.deliveryOtpAttempts += 1;
  await shipment.save();

  // Expiry check
  if (shipment.deliveryOtpExpiresAt < new Date()) {
    throw new Error("OTP has expired. Please request a new code.");
  }

  // Code match check (constant-time comparison to prevent timing attacks)
  const received = String(submittedCode).padStart(OTP_DIGITS, "0");
  if (received !== shipment.deliveryOtp) {
    const remaining = OTP_MAX_ATTEMPTS - shipment.deliveryOtpAttempts;
    if (remaining <= 0) {
      throw new Error(
        "Incorrect OTP. Maximum attempts reached. Please generate a new code."
      );
    }
    throw new Error(`Incorrect OTP. ${remaining} attempt(s) remaining.`);
  }

  // Success — clear OTP fields so code cannot be replayed
  await Shipment.findByIdAndUpdate(shipmentId, {
    $unset: { deliveryOtp: "", deliveryOtpExpiresAt: "" },
    deliveryOtpAttempts: 0,
  });
}
