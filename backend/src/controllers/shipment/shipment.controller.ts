import type { Request, Response } from "express";
import { ShipmentService } from "../../services/shipment/shipment.service.js";
import { generateOtp } from "../../services/shipment/otp.service.js";
import type { AuthRequest } from "../../middlewares/userAuth.middleware.js";
import { getIo } from "../../socket/socket.js";
import mongoose from "mongoose";

const shipmentService = new ShipmentService();

export class ShipmentController {
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || (req.query.companyId as string | undefined);
      const shipments = await shipmentService.listShipments(companyId);
      return res.status(200).json({ success: true, data: shipments });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error("Invalid shipment ID format");
      }
      const result = await shipmentService.getShipmentById(id, req.user?.companyId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error("Invalid shipment ID format");
      }
      const result = await shipmentService.updateShipmentStatus(id, {
        status: req.body.status,
        note: req.body.note,
        actorId: req.user?.sub,
        companyId: req.user?.companyId,
      });

      // If a delivery OTP was generated (status = OUT_FOR_DELIVERY), broadcast it
      // to the company operations room via Socket.io so dispatchers can see it.
      if (result.generatedOtp) {
        const io = getIo();
        if (io) {
          io.to(`company_${req.user?.companyId}`).emit("shipment:otp_generated", {
            shipmentId: id,
            otp: result.generatedOtp,
            message: `Delivery OTP generated for shipment ${id}`,
            expiresInMinutes: 5,
          });
        }
      }

      return res.status(200).json({ success: true, data: result.shipment });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/shipments/:id/verify-otp
   * Validates the customer-provided OTP and marks the shipment as DELIVERED.
   */
  async verifyOtp(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error("Invalid shipment ID format");
      }

      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ success: false, message: "OTP code is required." });
      }

      const shipment = await shipmentService.verifyDeliveryOtp(
        id,
        code,
        req.user?.sub,
        req.user?.companyId
      );

      // Broadcast delivery confirmation to the company room
      const io = getIo();
      if (io) {
        io.to(`company_${req.user?.companyId}`).emit("shipment:delivered", {
          shipmentId: id,
          trackingNumber: (shipment as any).trackingNumber,
          deliveredAt: (shipment as any).deliveredAt,
          message: "Shipment has been delivered and OTP handshake confirmed.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "OTP verified. Shipment marked as DELIVERED.",
        data: shipment,
      });
    } catch (error: any) {
      const isRateLimit = error.message.includes("Too many") || error.message.includes("Maximum attempts");
      return res.status(isRateLimit ? 429 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/shipments/:id/generate-otp
   * Allows authorized users (dispatcher) to re-send/regenerate an OTP code.
   */
  async generateOtp(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid shipment ID format" });
      }

      // Verify shipment belongs to this company before generating
      const { shipment } = await shipmentService.getShipmentById(id, req.user?.companyId);

      const code = await generateOtp(id);

      // Trigger notifications for new code
      const trackingLink = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/tracking/${shipment.trackingNumber}`;
      const { sendDeliveryNotifications } = await import("../../services/notification/notification.service.js");
      void sendDeliveryNotifications({
        customerName: shipment.customerName,
        customerEmail: (shipment as any).customerEmail,
        customerPhone: shipment.customerPhone,
        otp: code,
        trackingNumber: shipment.trackingNumber,
        trackingLink
      });

      // Emit updated OTP to company room
      const io = getIo();
      if (io) {
        io.to(`company_${req.user?.companyId}`).emit("shipment:otp_generated", {
          shipmentId: id,
          otp: code,
          message: `New delivery OTP generated for shipment ${id}`,
          expiresInMinutes: 5,
        });
      }

      return res.status(200).json({
        success: true,
        message: "New OTP generated and broadcast to operations room.",
        data: { shipmentId: id, otp: code, expiresInMinutes: 5 },
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/shipments/:id/feedback
   * Public route (requires no auth) to submit customer feedback.
   */
  async submitFeedback(req: Request, res: Response) {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid shipment ID format" });
      }

      const { rating, comment } = req.body;
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be a number between 1 and 5." });
      }

      if (comment && typeof comment === "string" && comment.length > 500) {
        return res.status(400).json({ success: false, message: "Comment cannot exceed 500 characters." });
      }

      const { Shipment } = await import("../../models/Shipment.model.js");
      const shipment = await Shipment.findById(id);

      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found." });
      }

      shipment.feedback = {
        rating,
        comment: comment || "",
        submittedAt: new Date()
      };

      await shipment.save();

      // Emit new feedback via socket.io to the company room
      const io = getIo();
      if (io) {
        io.to(`company_${shipment.companyId}`).to(`company:${shipment.companyId}`).emit("dashboard:new_feedback", {
          shipmentId: id,
          trackingNumber: shipment.trackingNumber,
          rating,
          comment: comment || "",
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: "Feedback submitted successfully.",
        data: shipment.feedback
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/shipments/:id/public
   * Public route (no auth required) to load public shipment details for tracking or feedback.
   */
  async getPublicDetails(req: Request, res: Response) {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid shipment ID format" });
      }

      const { Shipment } = await import("../../models/Shipment.model.js");
      const shipment = await Shipment.findById(id)
        .select("trackingNumber customerName status deliveredAt pickupAddress deliveryAddress")
        .lean();

      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found." });
      }

      return res.status(200).json({ success: true, data: shipment });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/shipments/bulk-import
   * Imports multiple shipments via CSV parsing results.
   */
  async bulkImport(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const rows = req.body.shipments;

      if (!companyId || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ success: false, message: "Invalid payload format. Expected 'shipments' array." });
      }

      const result = await shipmentService.bulkImport(companyId, actorId, rows);

      if (result.successCount === 0 && result.failedCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Bulk import failed: all ${result.failedCount} rows contained errors`,
          data: result
        });
      }

      return res.status(200).json({
        success: true,
        message: `Bulk import completed: ${result.successCount} created, ${result.failedCount} failed`,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Internal server error during bulk import" });
    }
  }
}

