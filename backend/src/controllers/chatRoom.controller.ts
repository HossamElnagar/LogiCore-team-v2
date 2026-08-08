// backend/controllers/chatRoom.controller.ts

import type { Response } from "express";
import type { AuthRequest } from "../middlewares/userAuth.middleware.js";
import { ChatRoom, ChatRoomType } from "../models/ChatRoom.model.js";
import { Message } from "../models/Message.model.js";
import { Incident } from "../models/Incedent.model.js";
import { UserRole } from "../types/user.type.js";
import { getIo } from "../socket/socket.js";
import mongoose from "mongoose";

export class ChatRoomController {
  /**
   * GET /api/chat-rooms
   * Retrieves active chat rooms for the authenticated tenant.
   * Supports filtering by type (e.g., INCIDENT, DIRECT).
   * Populates participants' basic profiles and the escalation creator if exists.
   */
  async getRooms(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { type } = req.query;
      const query: any = { companyId: new mongoose.Types.ObjectId(companyId) };

      if (type && Object.values(ChatRoomType).includes(type as ChatRoomType)) {
        query.type = type;
      }

      // If user is a driver, only show rooms they are participating in
      if (req.user?.role === UserRole.DRIVER) {
        query.participants = req.user.sub;
      }

      const rooms = await ChatRoom.find(query)
        .populate("participants", "userName role email")
        .populate("createdById", "userName role email") // Populate escalation creator profile
        .sort({ updatedAt: -1 })
        .lean();

      return res.status(200).json({ success: true, data: rooms });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/chat-rooms/:id/messages
   * Paginated retrieval of messages for a specific room, sorted descending by createdAt.
   */
  async getMessages(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!id || !companyId || !mongoose.Types.ObjectId.isValid(id as string)) {
        console.log("getMessages ERROR ->", { id, companyId, isValid: mongoose.Types.ObjectId.isValid(id as string) });
        return res.status(400).json({ success: false, message: "Invalid room ID or company context" });
      }

      const room = await ChatRoom.findOne({
        _id: new mongoose.Types.ObjectId(id as string),
        companyId: new mongoose.Types.ObjectId(companyId as string),
      }).lean();

      if (!room) {
        return res.status(404).json({ success: false, message: "Chat room not found" });
      }

      // Check participant access (unless they are a manager who can oversee all)
      const isManager = req.user?.role && [UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER, UserRole.OWNER].includes(req.user.role as UserRole);
      
      const isParticipant = room.participants.some(
        (p: mongoose.Types.ObjectId) => String(p) === String(req.user?.sub)
      );

      if (!isParticipant && !isManager) {
        return res.status(403).json({ success: false, message: "Access denied. Not a participant of this room." });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;
      const skip = (page - 1) * limit;

      const messages = await Message.find({ roomId: room._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return res.status(200).json({
        success: true,
        data: messages,
        meta: { page, limit },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/chat-rooms/escalate
   * Creates an emergency escalation chat room between a CS agent and a Manager.
   * Emits a real-time WebSocket notification directly to the selected manager.
   */
  async createManagerEscalationRoom(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const agentId = req.user?.sub; // Authenticated CS Agent ID
      const { managerId, issueTitle } = req.body;

      if (!companyId || !agentId) {
        return res.status(401).json({ success: false, message: "Unauthorized context." });
      }

      if (req.user?.role !== UserRole.CS_AGENT) {
        return res.status(403).json({ success: false, message: "Only CS_AGENTs can trigger an emergency escalation." });
      }

      if (!managerId || !issueTitle?.trim()) {
        return res.status(400).json({ success: false, message: "Manager ID and Issue Title are required." });
      }

      // Create room with CS Agent and selected Manager as participants
      const newRoom = await ChatRoom.create({
        companyId: new mongoose.Types.ObjectId(companyId),
        type: ChatRoomType.DIRECT, // Managed escalations behave as direct chats
        participants: [
          new mongoose.Types.ObjectId(agentId),
          new mongoose.Types.ObjectId(managerId)
        ],
        title: issueTitle.trim(),
        createdById: new mongoose.Types.ObjectId(agentId)
      });

      // Populate fresh data to prepare full payload for client application
      const populatedRoom = await ChatRoom.findById(newRoom._id)
        .populate("participants", "userName role email")
        .populate("createdById", "userName role email")
        .lean();

      // Emit dynamic socket signal directly to the Manager's personal user room stream
      const io = getIo();
      if (io) {
        io.to(`user_${managerId}`).emit("new_escalation_chat", populatedRoom);
      }

      return res.status(201).json({ success: true, data: populatedRoom });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/chat-rooms/:id/resolve
   * Transitions an active incident chat to a resolved state.
   * Restricted to CS_AGENT (assigned) or CS_MANAGER.
   */
  async resolveRoom(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;
      const role = req.user?.role;
      const userId = req.user?.sub;

      if (!mongoose.Types.ObjectId.isValid(id as string) || !companyId) {
        return res.status(400).json({ success: false, message: "Invalid room ID or missing company context" });
      }

      if (role !== UserRole.CS_AGENT && role !== UserRole.CS_MANAGER) {
        return res.status(403).json({ success: false, message: "Only CS_AGENT or CS_MANAGER can resolve a chat room." });
      }

      const room = await ChatRoom.findOne({
        _id: new mongoose.Types.ObjectId(id as string),
        companyId: new mongoose.Types.ObjectId(companyId as string),
      });

      if (!room) {
        return res.status(404).json({ success: false, message: "Chat room not found" });
      }

      if (room.type !== ChatRoomType.INCIDENT) {
        return res.status(400).json({ success: false, message: "Only INCIDENT rooms can be resolved this way." });
      }

      if (!room.incidentId) {
        return res.status(400).json({ success: false, message: "Room is not linked to any incident." });
      }

      const incident = await Incident.findOne({ _id: room.incidentId, companyId: new mongoose.Types.ObjectId(companyId!) });
      
      if (!incident) {
        return res.status(404).json({ success: false, message: "Associated incident not found." });
      }

      // If CS_AGENT, must be assigned to the ticket OR ticket must be unassigned
      if (role === UserRole.CS_AGENT) {
        if (incident.assignedTo && String(incident.assignedTo) !== String(userId)) {
          return res.status(403).json({ success: false, message: "You can only resolve incidents you are assigned to." });
        }
        
        // Auto-assign if it was unassigned
        if (!incident.assignedTo) {
          incident.assignedTo = new mongoose.Types.ObjectId(userId) as any;
        }
      }

      // Mark incident as RESOLVED
      incident.status = "RESOLVED" as any;
      incident.resolvedAt = new Date();
      await incident.save();

      // Broadcast resolution event via Socket.io
      const io = getIo();
      if (io) {
        io.to(String(room._id)).emit("room_resolved", {
          roomId: room._id,
          incidentId: incident._id,
          resolvedBy: userId,
          timestamp: new Date().toISOString(),
          message: "The incident has been resolved and the chat room is now closed."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Room resolved successfully.",
        data: { roomId: room._id, incidentId: incident._id, status: incident.status }
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/chat-rooms/incident/:incidentId
   * Idempotently gets or creates an INCIDENT chat room for the specified incident.
   * Auto-adds requesting participant if they have proper access.
   */
  async getOrCreateIncidentRoom(req: AuthRequest, res: Response) {
    try {
      const { incidentId } = req.params;
      const companyId = req.user?.companyId;
      const userId = req.user?.sub;

      if (!incidentId || !companyId || !userId || !mongoose.Types.ObjectId.isValid(incidentId as string)) {
        return res.status(400).json({ success: false, message: "Invalid incident ID or missing authentication context" });
      }

      const incident = await Incident.findOne({
        _id: new mongoose.Types.ObjectId(incidentId as string),
        companyId: new mongoose.Types.ObjectId(companyId as string),
      });

      if (!incident) {
        return res.status(404).json({ success: false, message: "Incident not found" });
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);

      // If room already linked to incident, retrieve it
      if (incident.chatRoomId) {
        const existingRoom = await ChatRoom.findOne({
          _id: incident.chatRoomId,
          companyId: new mongoose.Types.ObjectId(companyId as string)
        }).populate("participants", "userName role email isOnline phone").populate("createdById", "userName role email");

        if (existingRoom) {
          // Check if current user is in participants; if not and allowed, add them
          const inParticipants = existingRoom.participants.some((p: any) => String(p._id || p) === String(userId));
          if (!inParticipants) {
            await ChatRoom.findByIdAndUpdate(existingRoom._id, {
              $addToSet: { participants: userObjectId }
            });
            const updatedRoom = await ChatRoom.findById(existingRoom._id)
              .populate("participants", "userName role email isOnline phone")
              .populate("createdById", "userName role email")
              .lean();
            return res.status(200).json({ success: true, data: updatedRoom });
          }
          return res.status(200).json({ success: true, data: existingRoom });
        }
      }

      // Check if a room already exists by incidentId just in case
      const roomByIncident = await ChatRoom.findOne({
        incidentId: incident._id,
        companyId: new mongoose.Types.ObjectId(companyId as string)
      }).populate("participants", "userName role email isOnline phone").populate("createdById", "userName role email");

      if (roomByIncident) {
        incident.chatRoomId = roomByIncident._id as any;
        await incident.save();
        return res.status(200).json({ success: true, data: roomByIncident });
      }

      // Create new incident room
      const participantsList = [new mongoose.Types.ObjectId(String(incident.reportedBy))];
      if (String(incident.reportedBy) !== String(userId)) {
        participantsList.push(userObjectId);
      }
      if (incident.assignedTo && String(incident.assignedTo) !== String(userId) && String(incident.assignedTo) !== String(incident.reportedBy)) {
        participantsList.push(new mongoose.Types.ObjectId(String(incident.assignedTo)));
      }

      const newRoom = await ChatRoom.create({
        companyId: new mongoose.Types.ObjectId(companyId as string),
        type: ChatRoomType.INCIDENT,
        participants: participantsList,
        incidentId: incident._id,
        title: incident.title || `Incident #${String(incident._id).slice(-6)}`,
        createdById: userObjectId
      });

      incident.chatRoomId = newRoom._id as any;
      await incident.save();

      const populatedRoom = await ChatRoom.findById(newRoom._id)
        .populate("participants", "userName role email isOnline phone")
        .populate("createdById", "userName role email")
        .lean();

      return res.status(201).json({ success: true, data: populatedRoom });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}