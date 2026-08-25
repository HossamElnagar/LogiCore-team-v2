import mongoose, { Schema, Document } from "mongoose";

export enum SettlementStatus {
  PENDING = "PENDING",
  RECONCILED = "RECONCILED",
  DISPUTED = "DISPUTED",
}

export interface ISettlement extends Document {
  companyId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  /** List of shipment ObjectIds settled in this reconciliation */
  shipmentIds: mongoose.Types.ObjectId[];
  /** ISO date string (YYYY-MM-DD) — the settlement day, not a timestamp */
  settlementDate: Date;
  /** Sum of codAmount for all DELIVERED COD shipments by this driver on settlementDate */
  expectedCash: number;
  /** Physical cash the driver actually handed in at the warehouse */
  collectedCash: number;
  /** collectedCash − expectedCash  (negative = driver short, positive = driver over) */
  discrepancyAmount: number;
  status: SettlementStatus;
  /** Manager who verified and closed this settlement */
  verifiedBy?: mongoose.Types.ObjectId;
  /** Optional manager notes explaining any discrepancy */
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const settlementSchema = new Schema<ISettlement>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    shipmentIds: {
      type: [Schema.Types.ObjectId],
      ref: "Shipment",
      default: [],
      index: true,
    },
    settlementDate: {
      type: Date,
      required: true,
    },
    expectedCash: {
      type: Number,
      required: true,
      min: 0,
    },
    collectedCash: {
      type: Number,
      required: true,
      min: 0,
    },
    discrepancyAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SettlementStatus),
      default: SettlementStatus.PENDING,
      index: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate settlements for the same driver on the same day
settlementSchema.index({ companyId: 1, driverId: 1, settlementDate: 1 }, { unique: true });
settlementSchema.index({ companyId: 1, settlementDate: 1 });

export const Settlement = mongoose.model<ISettlement>("Settlement", settlementSchema);
