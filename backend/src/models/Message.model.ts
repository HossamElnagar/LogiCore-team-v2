import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  shipmentId?: string; // Legacy field, optional during migration
  roomId?: mongoose.Types.ObjectId; // New reference to ChatRoom
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  text: string;
  proofDocUrl?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    shipmentId: {
      type: String,
      required: false, // Legacy field — kept temporarily during migration
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: false, // Optional during the dual-write migration window
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    proofDocUrl: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ roomId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>("Message", messageSchema);
