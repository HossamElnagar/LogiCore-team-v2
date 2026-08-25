import mongoose, { Schema, Document } from "mongoose";
import { ShipmentStatus, PaymentMethod, IncidentReason } from "../types/shipment.type.js";

export interface IShipment extends Document {
  companyId: mongoose.Types.ObjectId;
  trackingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  currentLocation?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  status: ShipmentStatus;
  paymentMethod: PaymentMethod;
  codAmount: number; // المبلغ المطلوب تحصيله عند الاستلام
  assignedDriver?: mongoose.Types.ObjectId;
  assignedVehicle?: mongoose.Types.ObjectId;
  estimatedDeliveryTime?: Date;
  deliveredAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  // OTP Delivery Handshake fields
  deliveryOtp?: string;
  deliveryOtpExpiresAt?: Date;
  deliveryOtpAttempts: number;
  // Bulk Import
  batchId?: string;
  importedVia?: "MANUAL" | "CSV_BULK";
  // Pointer to the most recent/active Incident (eliminates embedded redundancy)
  activeIncidentId?: mongoose.Types.ObjectId;
  feedback?: {
    rating: number;
    comment?: string;
    submittedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const shipmentSchema = new Schema<IShipment>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    currentLocation: String,
    deliveryLat: {
      type: Number,
      min: -90,
      max: 90,
    },
    deliveryLng: {
      type: Number,
      min: -180,
      max: 180,
    },
    status: {
      type: String,
      enum: Object.values(ShipmentStatus),
      default: ShipmentStatus.CREATED,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CASH_ON_DELIVERY
    },
    codAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    assignedDriver: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedVehicle: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    estimatedDeliveryTime: Date,
    deliveredAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // OTP Delivery Handshake fields
    deliveryOtp: {
      type: String,
      select: false, // Never expose the raw OTP code in query results
    },
    deliveryOtpExpiresAt: {
      type: Date,
      select: false,
    },
    deliveryOtpAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    batchId: {
      type: String,
      index: true,
    },
    importedVia: {
      type: String,
      enum: ["MANUAL", "CSV_BULK"],
      default: "MANUAL",
    },
    // Pointer to the currently active Incident
    activeIncidentId: {
      type: Schema.Types.ObjectId,
      ref: "Incident",
      default: null,
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true },
      submittedAt: { type: Date }
    },
  },
  {
    timestamps: true,
  }
);

// تصحيح الـ Indexes بناءً على أسماء الحقول الفعلية في الـ Schema
shipmentSchema.index({ companyId: 1, status: 1 });
shipmentSchema.index({ assignedDriver: 1 });
shipmentSchema.index({ trackingNumber: 1 });

export const Shipment = mongoose.model<IShipment>("Shipment", shipmentSchema);