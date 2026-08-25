import mongoose, { Schema, Document } from "mongoose";

export interface IHub extends Document {
  companyId: mongoose.Types.ObjectId;
  hubCode: string;
  name: string;
  city: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hubSchema = new Schema<IHub>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    hubCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
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

hubSchema.index({ companyId: 1, hubCode: 1 }, { unique: true });
hubSchema.index({ companyId: 1, isActive: 1 });

export const Hub = mongoose.model<IHub>("Hub", hubSchema);
