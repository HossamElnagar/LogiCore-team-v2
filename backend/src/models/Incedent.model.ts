import mongoose, { Schema, Document } from "mongoose";

import {
  IncidentSeverity,
  IncidentStatus,
  IncidentEntityType,
} from "../types/incident.type.js";

export interface IIncident extends Document {
  companyId: mongoose.Types.ObjectId;

  title: string;

  description: string;

  severity: IncidentSeverity;

  status: IncidentStatus;

  relatedEntityType: IncidentEntityType;

  relatedEntityId: mongoose.Types.ObjectId;

  reportedBy: mongoose.Types.ObjectId;

  assignedTo?: mongoose.Types.ObjectId;

  chatRoomId?: mongoose.Types.ObjectId;

  shipmentId?: mongoose.Types.ObjectId;

  escalatedByManager: boolean;

  escalatedBy?: mongoose.Types.ObjectId;

  attachments: string[];

  resolvedAt?: Date;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncident>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    severity: {
      type: String,
      enum: Object.values(IncidentSeverity),
      default: IncidentSeverity.MEDIUM,
    },

    status: {
      type: String,
      enum: Object.values(IncidentStatus),
      default: IncidentStatus.OPEN,
    },

    relatedEntityType: {
      type: String,
      enum: Object.values(IncidentEntityType),
      required: true,
    },

    relatedEntityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    chatRoomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      default: null,
    },

    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
      index: true,
    },

    escalatedByManager: {
      type: Boolean,
      default: false,
    },

    escalatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    attachments: {
      type: [String],
      default: [],
    },

    resolvedAt: Date,

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

incidentSchema.index({
  companyId: 1,
  status: 1,
});

incidentSchema.index({
  companyId: 1,
  escalatedByManager: 1,
  status: 1,
});

incidentSchema.index({
  relatedEntityType: 1,
  relatedEntityId: 1,
});
export const Incident = mongoose.model<IIncident>(
  "Incident",
  incidentSchema
);