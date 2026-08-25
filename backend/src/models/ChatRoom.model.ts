

import mongoose, { type HydratedDocument, Schema, type Document } from "mongoose"; 

// ── Enumerations ──────────────────────────────────────────────────────────────

export enum ChatRoomType {
  INCIDENT = "INCIDENT", 
  DIRECT = "DIRECT",     
  GROUP = "GROUP",       
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IChatRoom extends Document {
 
  companyId: mongoose.Types.ObjectId; 

 
  type: ChatRoomType; 

  
  participants: mongoose.Types.ObjectId[]; 

  
  incidentId: mongoose.Types.ObjectId | null; 

  /** 
   * @property title
   
   */
  title?: string | null;

  /** 
   * @property createdById
  
   */
  createdById?: mongoose.Types.ObjectId | null;

  createdAt: Date; 
  updatedAt: Date; 
}

/** Fully hydrated ChatRoom document type (includes Mongoose instance methods). */
export type ChatRoomDocument = HydratedDocument<IChatRoom>; 

// ── Schema ────────────────────────────────────────────────────────────────────

const chatRoomSchema = new Schema<IChatRoom>(
  {
    // ── Tenant isolation ────────────────────────────────────────────────────
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "companyId is required — every ChatRoom must belong to a tenant."], 
    },

   
    type: {
      type: String,
      enum: {
        values: Object.values(ChatRoomType),
        message: `type must be one of: ${Object.values(ChatRoomType).join(", ")}`, 
      },
      required: [true, "type is required."], 
    },

    // ── Participants ────────────────────────────────────────────────────────
    participants: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [], 
      validate: {
        validator(value: mongoose.Types.ObjectId[]): boolean {
          const ids = value.map((id) => id.toString());
          return ids.length === new Set(ids).size; 
        },
        message: "participants array must not contain duplicate user IDs.", 
      },
    },

    // ── Incident back-reference ─────────────────────────────────────────────
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: "Incident",
      default: null, 
    },

    // ── Manager Escalation Fields ───────────────────────────────────────────
    title: {
      type: String,
      default: null,
      trim: true,
    },

    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    // ── Schema options ──────────────────────────────────────────────────────
    timestamps: true, 
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
    toObject: {
      virtuals: true, 
      versionKey: false, 
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

chatRoomSchema.index({ companyId: 1, type: 1 }); 

chatRoomSchema.index({ participants: 1 }); 

chatRoomSchema.index({ incidentId: 1 }, { sparse: true }); 

// ── Model export ──────────────────────────────────────────────────────────────

export const ChatRoom = mongoose.model<IChatRoom>("ChatRoom", chatRoomSchema); 