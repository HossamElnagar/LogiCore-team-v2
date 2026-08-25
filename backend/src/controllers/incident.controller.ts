/**
 * incident.controller.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * HTTP Controller for the Dual-Ingress Incident Management API.
 *
 * Endpoints:
 *
 *  POST /api/incidents/driver    — Ground Ingress (DRIVER/RIDER only)
 *       → Enforces Haversine geo-fence + mandatory proof photo
 *
 *  POST /api/incidents/admin     — Administrative Ingress (Managers only)
 *       → Bypasses geo-fence and photo requirements
 *
 *  GET  /api/incidents           — List all incidents (company-scoped)
 *  GET  /api/incidents/:id       — Get single incident by ID
 *  PATCH /api/incidents/:id/status — Update incident status
 *
 * Error Handling:
 *  - IncidentError instances carry their own HTTP status codes and
 *    machine-readable error codes for frontend consumption.
 *  - All other errors fall through as 500 Internal Server Error.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Response } from "express";
import { IncidentService, IncidentError } from "../services/incident.service.js";
import type { AuthRequest } from "../middlewares/userAuth.middleware.js";

const incidentService = new IncidentService();

export class IncidentController {
  /**
   * POST /api/incidents/driver
   * ──────────────────────────────────────────────────────────────────────
   * Ground-level incident ingress for DRIVER and RIDER roles.
   *
   * Required body:
   *  - shipmentId (ObjectId)
   *  - reason (IncidentReason enum)
   *  - comment (string, 5-1000 chars)
   *  - driverLat (number, -90 to 90)
   *  - driverLng (number, -180 to 180)
   *  - proofImage (valid URL)
   *
   * Enforced validations:
   *  - Haversine geo-fence (150m radius)
   *  - Shipment ownership (assigned to requesting driver)
   *  - Multi-tenant company scoping
   */
  async logDriverIncident(req: AuthRequest, res: Response) {
    try {
      const result = await incidentService.logDriverIncident(
        req.body,
        req.user?.companyId,
        req.user?.sub,
        req.user?.role
      );

      return res.status(201).json({
        success: true,
        message: "Incident logged successfully via ground ingress.",
        data: result,
      });
    } catch (error: any) {
      return IncidentController._handleError(res, error);
    }
  }

  /**
   * POST /api/incidents/admin
   * ──────────────────────────────────────────────────────────────────────
   * Administrative incident ingress for OWNER, CS_MANAGER,
   * DRIVER_MANAGER, and CS_AGENT roles.
   *
   * Required body:
   *  - shipmentId (ObjectId)
   *  - reason (IncidentReason enum)
   *  - comment (string, 5-1000 chars)
   *
   * Optional body:
   *  - proofImage (valid URL)
   *
   * Bypass rules:
   *  - No GPS geo-fence validation
   *  - No mandatory proof photo
   */
  async logAdminIncident(req: AuthRequest, res: Response) {
    try {
      const result = await incidentService.logAdminIncident(
        req.body,
        req.user?.companyId,
        req.user?.sub,
        req.user?.role
      );

      return res.status(201).json({
        success: true,
        message: "Incident logged successfully via administrative ingress.",
        data: result,
      });
    } catch (error: any) {
      return IncidentController._handleError(res, error);
    }
  }

  /**
   * GET /api/incidents
   * ──────────────────────────────────────────────────────────────────────
   * Lists all incidents scoped to the authenticated user's company.
   * Sorted by creation date (newest first).
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const incidents = await incidentService.listIncidents(
        req.user?.companyId,
        req.user?.sub,
        req.user?.role
      );
      return res.status(200).json({ success: true, data: incidents });
    } catch (error: any) {
      return IncidentController._handleError(res, error);
    }
  }

  /**
   * GET /api/incidents/:id
   * ──────────────────────────────────────────────────────────────────────
   * Retrieves a single incident by ID, scoped to the authenticated user's
   * company. Returns 404 if not found or cross-tenant access.
   */
  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!id) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PARAMS",
          message: "Incident ID parameter is required.",
        });
      }

      const incident = await incidentService.getIncidentById(
        id,
        req.user?.companyId
      );
      return res.status(200).json({ success: true, data: incident });
    } catch (error: any) {
      return IncidentController._handleError(res, error);
    }
  }

  /**
   * PATCH /api/incidents/:id/status
   * ──────────────────────────────────────────────────────────────────────
   * Updates an incident's status (e.g., RESOLVED, CLOSED).
   * Only authenticated users from the same company may update.
   */
  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!id) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PARAMS",
          message: "Incident ID parameter is required.",
        });
      }

      const incident = await incidentService.updateIncidentStatus(
        id,
        req.body.status,
        req.user?.companyId
      );

      return res.status(200).json({ success: true, data: incident });
    } catch (error: any) {
      return IncidentController._handleError(res, error);
    }
  }

  // ── Centralized Error Response Handler ────────────────────────────────

  /**
   * Maps IncidentError instances to proper HTTP responses with
   * machine-readable error codes. Unknown errors return 500.
   */
  private static _handleError(res: Response, error: any): Response {
    if (error instanceof IncidentError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
        ...(error.meta ? { meta: error.meta } : {}),
      });
    }

    // Unexpected / unhandled errors → 500
    console.error("[IncidentController] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
}
