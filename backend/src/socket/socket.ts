import { Server as SocketServer } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/User.model.js";
import { UserRole } from "../types/user.type.js";

let io: SocketServer | null = null;

const unreadState = new Map<string, Map<string, number>>();

function getUnreadMap(userId: string): Map<string, number> {
  if (!unreadState.has(userId)) {
    unreadState.set(userId, new Map<string, number>());
  }
  return unreadState.get(userId)!;
}

function incrementUnreadCount(userId: string, roomId: string) {
  const userUnreadMap = getUnreadMap(userId);
  const currentCount = userUnreadMap.get(roomId) || 0;
  userUnreadMap.set(roomId, currentCount + 1);
  return userUnreadMap.get(roomId)!;
}

function clearUnreadCount(userId: string, roomId: string) {
  const userUnreadMap = getUnreadMap(userId);
  userUnreadMap.delete(roomId);
}

async function shouldNotifyRecipient(recipientId: string, room: any, senderRole?: string) {
  const recipient = await User.findById(recipientId).select("role").lean();
  if (!recipient) return false;

  const recipientRole = recipient.role as UserRole;
  const isParticipant = room.participants.some((participant: any) => String(participant) === recipientId);

  if (recipientRole === UserRole.OWNER) {
    return true;
  }

  if (recipientRole === UserRole.CS_MANAGER) {
    return isParticipant;
  }

  if (recipientRole === UserRole.DRIVER) {
    return isParticipant && room.type === "INCIDENT";
  }

  if (recipientRole === UserRole.DRIVER_MANAGER) {
    return isParticipant;
  }

  return isParticipant;
}

/**
 * initSocket
 * Attaches a Socket.io server to the existing HTTP server.
 * Must be called once during server startup, after the HTTP server is created.
 */
export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    connectionStateRecovery: {
      // Allow clients to recover missed events for up to 2 minutes
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  // ── JWT Authentication Middleware ──────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret") as {
        sub: string;
        companyId: string;
        role: string;
      };
      socket.data.userId = decoded.sub;
      socket.data.companyId = decoded.companyId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const { userId, companyId } = socket.data as {
      userId: string;
      companyId: string;
      role: string;
    };

    // Join the company broadcast room — all events for this tenant are scoped here
    await socket.join(`company_${companyId}`);
    await socket.join(`company:${companyId}`);

    await socket.join(`user_${userId}`);

    // Mark user online in the database
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        currentSocketId: socket.id,
        lastSeen: new Date(),
      });

      // Broadcast the user's presence to their company room
      io!.to(`company_${companyId}`).to(`company:${companyId}`).emit("presence:online", {
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[Socket] Failed to update user presence on connect:", err);
    }

    // ── Driver Location Update Listener ──────────────────────────────────────
    socket.on("driver:location_update", (payload: { latitude?: number; longitude?: number; bearing?: number; speed?: number }) => {
      const { latitude, longitude, bearing = 0, speed = 0 } = payload || {};

      // Basic validation
      if (
        typeof latitude !== "number" ||
        latitude < -90 ||
        latitude > 90 ||
        typeof longitude !== "number" ||
        longitude < -180 ||
        longitude > 180
      ) {
        console.warn(`[Socket] Invalid location update received from driver ${userId}:`, payload);
        return;
      }

      // Broadcast to that company's specific room
      io!.to(`company:${companyId}`).emit("fleet:location_changed", {
        driverId: userId,
        latitude,
        longitude,
        bearing,
        speed,
        timestamp: new Date().toISOString(),
      });
    });

    // ── ChatRoom Connection / Join ───────────────────────────────────────────
    socket.on("join_room", async (payload: { roomId: string }) => {
      try {
        const { roomId } = payload || {};
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) return;
        
        const { ChatRoom } = await import("../models/ChatRoom.model.js");
        const room = await ChatRoom.findOne({
          _id: roomId,
          companyId: new mongoose.Types.ObjectId(companyId)
        });

        if (!room) {
          socket.emit("error", { message: "Room not found or access denied." });
          return;
        }

        const isParticipant = room.participants.some((p: any) => String(p) === String(userId));

        // Only join socket room if already a participant
        if (!isParticipant) {
          // Silent fail — don't emit error, just don't join
          return;
        }

        await socket.join(roomId);
        clearUnreadCount(userId, roomId);
        socket.emit("room_read", { roomId, unreadCount: 0 });
        socket.emit("room_joined", { roomId });
      } catch (err) {
        console.error("[Socket] Error in join_room:", err);
      }
    });

    // ── ChatRoom Message Handling ────────────────────────────────────────────
    socket.on("send_message", async (payload: { roomId: string; text: string; attachments?: string[] }) => {
      try {
        const { roomId, text, attachments } = payload || {};
        if (!roomId || !text || !mongoose.Types.ObjectId.isValid(roomId)) return;

        const { ChatRoom } = await import("../models/ChatRoom.model.js");
        const { Message } = await import("../models/Message.model.js");
        const { User } = await import("../models/User.model.js");

        // Verify room access
        const room = await ChatRoom.findOne({
          _id: roomId,
          companyId: new mongoose.Types.ObjectId(companyId)
        }).lean();

        if (!room) {
          socket.emit("error", { message: "Room not found or access denied." });
          return;
        }

        // Only participants can send messages
        const isParticipant = room.participants.some((p: any) => String(p) === String(userId));
        if (!isParticipant) {
          socket.emit("error", { message: "Not a participant of this room." });
          return;
        }

        const sender = await User.findById(userId).select("userName role").lean();
        if (!sender) return;

        // Persist message to MongoDB
        const newMessage = new Message({
          roomId: new mongoose.Types.ObjectId(roomId),
          senderId: new mongoose.Types.ObjectId(userId),
          senderName: sender.userName,
          senderRole: sender.role,
          text,
          proofDocUrl: (attachments && attachments.length > 0) ? attachments[0] : null,
          timestamp: new Date()
        });
        await newMessage.save();

        // Broadcast the message to the room and notify every other participant about unread state.
        io!.to(roomId).emit("new_message", newMessage.toJSON());

        const recipientIds = room.participants
          .filter((participant: any) => String(participant) !== String(userId))
          .map((participant: any) => String(participant));

        for (const recipientId of recipientIds) {
          const shouldNotify = await shouldNotifyRecipient(recipientId, room, sender.role);
          if (!shouldNotify) continue;

          const unreadCount = incrementUnreadCount(recipientId, roomId);
          io!.to(`user_${recipientId}`).emit("unread_notification", {
            roomId,
            incidentId: room.incidentId ? String(room.incidentId) : null,
            senderId: userId,
            senderName: sender.userName,
            unreadCount,
          });
        }
      } catch (err) {
        console.error("[Socket] Error in send_message:", err);
      }
    });

    // ── Incident Created Listener ────────────────────────────────────────────
    socket.on("incident:created", async (payload: { incidentId: string }) => {
      const { incidentId } = payload || {};
      if (!incidentId || !mongoose.Types.ObjectId.isValid(incidentId)) return;

      try {
        const { Incident } = await import("../models/Incedent.model.js");
        const { Shipment } = await import("../models/Shipment.model.js");
        const incident = await Incident.findById(incidentId).lean();
        if (incident && incident.companyId.toString() === companyId) {
          // Resolve the tracking number for the broadcast payload
          let trackingNumber = "N/A";
          if (incident.relatedEntityId) {
            const shipment = await Shipment.findById(incident.relatedEntityId)
              .select("trackingNumber")
              .lean();
            if (shipment) {
              trackingNumber = shipment.trackingNumber;
            }
          }

          io!.to(`company:${companyId}`).to(`company_${companyId}`).emit("fleet:incident_alert", {
            incidentId: incident._id.toString(),
            title: incident.title,
            severity: incident.severity,
            relatedEntityType: incident.relatedEntityType,
            relatedEntityId: incident.relatedEntityId.toString(),
            trackingNumber,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("[Socket] Failed to broadcast incident:created alert:", err);
      }
    });

    // ── Disconnect Handler ───────────────────────────────────────────────────
    socket.on("disconnect", async (reason) => {
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          currentSocketId: undefined,
          lastSeen: new Date(),
        });

        // Broadcast offline presence to company room
        io!.to(`company_${companyId}`).to(`company:${companyId}`).emit("presence:offline", {
          userId,
          reason,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[Socket] Failed to update user presence on disconnect:", err);
      }
    });

    // ── Ping / Keep-alive ────────────────────────────────────────────────────
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });
  });

  console.log("[Socket.io] Server initialized");
  return io;
}

/**
 * getIo
 * Returns the singleton Socket.io server instance.
 * Throws if called before initSocket().
 */
export function getIo(): SocketServer | null {
  return io;
}
