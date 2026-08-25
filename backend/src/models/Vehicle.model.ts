import mongoose, { Schema, Document } from "mongoose";

export interface IVehicle extends Omit<Document, "model"> {
  companyId: mongoose.Types.ObjectId;
  plateNumber: string;
  model?: string;
  maxWeightKg?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    plateNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    model: {
      type: String,
      trim: true,
      default: "Standard Truck",
    },
    maxWeightKg: {
      type: Number,
      default: 5000,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

vehicleSchema.index({ companyId: 1, plateNumber: 1 }, { unique: true });
vehicleSchema.index({ companyId: 1, isActive: 1 });

export const Vehicle = mongoose.model<IVehicle>("Vehicle", vehicleSchema);
