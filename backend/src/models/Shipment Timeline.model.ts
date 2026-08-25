import mongoose, { Schema, Document } from "mongoose";

import { ShipmentEventType } from "../types/shipment.type.js";

export interface IShipmentTimeline extends Document {
  shipmentId: mongoose.Types.ObjectId;

  companyId: mongoose.Types.ObjectId;

  eventType: ShipmentEventType;

  message: string;

  createdBy?: mongoose.Types.ObjectId;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const shipmentTimelineSchema =
  new Schema<IShipmentTimeline>(
    {
      shipmentId: {
        type: Schema.Types.ObjectId,
        ref: "Shipment",
        required: true,
        index: true,
      },

      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },

      eventType: {
        type: String,
        enum: Object.values(ShipmentEventType),
        required: true,
      },

      message: {
        type: String,
        required: true,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      metadata: {
        type: Schema.Types.Mixed,
      },
    },
    {
      timestamps: true,
    }
  );

  
  shipmentTimelineSchema.index({
  shipmentId: 1,
  createdAt: -1
});


export const ShipmentTimeline =
  mongoose.model<IShipmentTimeline>(
    "ShipmentTimeline",
    shipmentTimelineSchema
  );