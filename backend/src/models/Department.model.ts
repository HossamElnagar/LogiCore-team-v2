import mongoose, { Schema, Document } from "mongoose";

export enum DepartmentType {
  OPERATIONS = "OPERATIONS",
  CS = "CS",
  FINANCE = "FINANCE",
}

export enum DepartmentStatus {
  CREATED = "CREATED",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface IDepartment extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  type: DepartmentType;
  status: DepartmentStatus;
  maxEmployees: number;
  location?: string;
  description?: string;
  managerId?: mongoose.Types.ObjectId;
}

const departmentSchema = new Schema<IDepartment>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: Object.values(DepartmentType), 
      required: true,
      default: DepartmentType.OPERATIONS 
    },
    status: { type: String, enum: Object.values(DepartmentStatus), default: DepartmentStatus.CREATED },
    maxEmployees: { type: Number, required: true, default: 10 },
    location: { type: String },
    description: { type: String },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Department = mongoose.model<IDepartment>("Department", departmentSchema);