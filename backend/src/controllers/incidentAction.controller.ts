import type { Response } from "express";
import type { AuthRequest } from "../middlewares/userAuth.middleware.js";
import { Incident } from "../models/Incedent.model.js";
import { ChatRoom, ChatRoomType } from "../models/ChatRoom.model.js";
import { UserRole } from "../types/user.type.js";
import { getIo } from "../socket/socket.js";
import { dispatchCsManagerNotification, managerExtensionsService } from "../services/managerExtensions.service.js";
import mongoose from "mongoose";

export class IncidentActionController {
  /**
   * PATCH /api/incidents/:id/assign
   * Assigns or re-assigns a CS_AGENT to the incident.
   * Auto-adds the assigned agent to the corresponding INCIDENT ChatRoom.
   */
  async assignAgent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { agentId } = req.body;
      const companyId = req.user?.companyId;

      if (!id || !agentId || !companyId || !mongoose.Types.ObjectId.isValid(id as string) || !mongoose.Types.ObjectId.isValid(agentId as string)) {
        return res.status(400).json({ success: false, message: "Invalid incident ID or agent ID, or missing context" });
      }

      const incident = await Incident.findOne({
        _id: new mongoose.Types.ObjectId(id as string),
        companyId: new mongoose.Types.ObjectId(companyId as string),
      });

      if (!incident) {
        return res.status(404).json({ success: false, message: "Incident not found" });
      }

      // Update assignment
      const newAssigneeId = new mongoose.Types.ObjectId(agentId as string);
      incident.assignedTo = newAssigneeId;
      await incident.save();

      // If the incident has a ChatRoom (or if we can find one linked to it), add the agent
      if (incident.chatRoomId) {
        const room = await ChatRoom.findOne({ _id: incident.chatRoomId, companyId: incident.companyId });
        
        if (room) {
          // Check if already in participants
          const alreadyInRoom = room.participants.some((p: mongoose.Types.ObjectId) => String(p) === String(newAssigneeId));
          if (!alreadyInRoom) {
            room.participants.push(newAssigneeId);
            await room.save();

            // Emit an invite event so the agent's client joins the room automatically
            const io = getIo();
            if (io) {
              io.to(`user_${String(newAssigneeId)}`).emit("chat:invited", {
                roomId: room._id,
                incidentId: incident._id,
                message: "You have been assigned to an incident and added to its chat room."
              });
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: "Agent assigned successfully.",
        data: incident
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/incidents/:id/escalate
   * Escalate the incident to the OWNER's attention.
   * Only CS_MANAGER can perform this action.
   */
  async escalateIncident(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!id || !companyId || !mongoose.Types.ObjectId.isValid(id as string)) {
        return res.status(400).json({ success: false, message: "Invalid incident ID or missing context" });
      }

      const incident = await Incident.findOne({
        _id: new mongoose.Types.ObjectId(id as string),
        companyId: new mongoose.Types.ObjectId(companyId as string),
      });

      if (!incident) {
        return res.status(404).json({ success: false, message: "Incident not found" });
      }

      if (incident.escalatedByManager) {
        return res.status(400).json({ success: false, message: "Incident is already escalated." });
      }

      incident.escalatedByManager = true;
      incident.escalatedBy = new mongoose.Types.ObjectId(req.user?.sub);
      await incident.save();

      // Notify the OWNER via socket
      const io = getIo();
      if (io) {
        io.to(`company_owners_${companyId}`).emit("incident:escalated", {
          incidentId: incident._id,
          escalatedBy: req.user?.sub,
          message: "An incident has been escalated to your attention."
        });
      }

      await managerExtensionsService.notifyManagers({
        event: "incident_escalated",
        companyId,
        incidentId: String(incident._id),
        senderId: String(req.user?.sub),
      });

      await dispatchCsManagerNotification({
        event: "incident:escalated",
        companyId: String(companyId),
        incidentId: String(incident._id),
        managerIds: [String(req.user?.sub)],
      });

      return res.status(200).json({
        success: true,
        message: "Incident escalated successfully.",
        data: incident
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/incidents/:id/escalate-to-manager
   * Escalate incident directly to a specific manager (CS_MANAGER, DRIVER_MANAGER, OWNER).
   * Available to CS_AGENT and CS_MANAGER.
   */
  async escalateToManager(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { managerId, managerIds, issueTitle } = req.body;
      const companyId = req.user?.companyId;
      const userId = req.user?.sub;

      const rawManagerIds = Array.isArray(managerIds)
        ? managerIds
        : managerId
          ? [managerId]
          : [];

      const normalizedManagerIds = rawManagerIds
        .filter((value): value is string => typeof value === "string" && Boolean(value))
        .filter((value) => mongoose.Types.ObjectId.isValid(value));

      if (!id || normalizedManagerIds.length === 0 || !companyId || !mongoose.Types.ObjectId.isValid(id as string)) {
        return res.status(400).json({ success: false, message: "Invalid incident ID, manager selection, or missing context" });
      }

      const incident = await Incident.findOne({
        _id: new mongoose.Types.ObjectId(id as string),
        companyId: new mongoose.Types.ObjectId(companyId as string),
      });

      if (!incident) {
        return res.status(404).json({ success: false, message: "Incident not found" });
      }

      const managerObjIds = normalizedManagerIds.map((managerIdValue) => new mongoose.Types.ObjectId(managerIdValue));
      const primaryManagerObjId = managerObjIds[0];
      incident.escalatedByManager = true;
      incident.escalatedBy = new mongoose.Types.ObjectId(userId);
      incident.assignedTo = primaryManagerObjId;
      incident.status = "IN_PROGRESS" as any;
      await incident.save();

      // Ensure room exists or update participants
      let room: any = null;
      if (incident.chatRoomId) {
        room = await ChatRoom.findOne({ _id: incident.chatRoomId, companyId: incident.companyId });
      }
      if (!room) {
        room = await ChatRoom.findOne({ incidentId: incident._id, companyId: incident.companyId });
      }
      if (!room) {
        const participantsList = [new mongoose.Types.ObjectId(String(incident.reportedBy))];
        if (userId && String(incident.reportedBy) !== String(userId)) {
          participantsList.push(new mongoose.Types.ObjectId(userId));
        }
        participantsList.push(...managerObjIds);

        room = await ChatRoom.create({
          companyId: new mongoose.Types.ObjectId(companyId as string),
          type: ChatRoomType.INCIDENT,
          participants: participantsList,
          incidentId: incident._id,
          title: issueTitle || incident.title || `Escalation: ${incident.title}`,
          createdById: new mongoose.Types.ObjectId(userId)
        });
        incident.chatRoomId = room._id as any;
        await incident.save();
      } else {
        const roomParticipants = room.participants || [];
        const newlyAddedManagers = managerObjIds.filter((managerObjId) => !roomParticipants.some((participant: mongoose.Types.ObjectId) => String(participant) === String(managerObjId)));

        if (newlyAddedManagers.length > 0) {
          await ChatRoom.findByIdAndUpdate(room._id, {
            $addToSet: { participants: { $each: newlyAddedManagers } }
          });
        }
        if (issueTitle && !room.title) {
          room.title = issueTitle;
          await room.save();
        }
      }

      const populatedRoom = await ChatRoom.findById(room._id)
        .populate("participants", "userName role email isOnline phone")
        .populate("createdById", "userName role email")
        .lean();

      // Emit real-time socket events
      const io = getIo();
      if (io) {
        for (const managerObjId of managerObjIds) {
          const managerIdValue = String(managerObjId);
          io.to(`user_${managerIdValue}`).emit("new_escalation_chat", {
            room: populatedRoom,
            incident,
            escalationTitle: issueTitle || incident.title,
            escalatedBy: req.user?.sub,
            timestamp: new Date().toISOString()
          });
          io.to(`user_${managerIdValue}`).emit("incident:escalated", {
            incidentId: incident._id,
            escalatedBy: req.user?.sub,
            message: `🚨 Emergency Escalation: ${issueTitle || incident.title}`
          });
        }
        io.to(String(room._id)).emit("incident:escalation_updated", {
          incident,
          managerIds: normalizedManagerIds,
          room: populatedRoom
        });
      }

      await managerExtensionsService.notifyManagers({
        event: "manager_added",
        companyId,
        incidentId: String(incident._id),
        managerIds: normalizedManagerIds,
        senderId: String(req.user?.sub),
      });

      await dispatchCsManagerNotification({
        event: "incident:escalated_to_manager",
        companyId: String(companyId),
        incidentId: String(incident._id),
        managerIds: managerObjIds.map((id) => String(id)),
        roomId: String(room._id),
      });

      return res.status(200).json({
        success: true,
        message: "Incident escalated to manager successfully.",
        data: { incident, room: populatedRoom }
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
