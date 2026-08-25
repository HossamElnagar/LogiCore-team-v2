import type { Response } from "express";
import type { AuthRequest } from "../middlewares/userAuth.middleware.js";
import { SettlementService } from "../services/settlement/settlement.service.js";
import { UserRole } from "../types/user.type.js";

const settlementService = new SettlementService();

const RECONCILE_ROLES: string[] = [
  UserRole.DRIVER_MANAGER,
  UserRole.CS_MANAGER,
  UserRole.OWNER,
  UserRole.ACCOUNTANT,
  UserRole.FINANCE_MANAGER,
];

export class SettlementController {
  /**
   * POST /api/settlements/reconcile
   * Warehouse manager submits the day-end cash reconciliation for a driver.
   *
   * Body: { driverId, collectedCash, settlementDate?, notes? }
   */
  async reconcile(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const managerId = req.user?.sub;
      const userRole: string = req.user?.role ?? "";

      if (!companyId || !managerId) {
        return res.status(401).json({ success: false, message: "Authentication context is required" });
      }

      if (!RECONCILE_ROLES.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to submit reconciliations.",
        });
      }

      const { driverId, collectedCash, settlementDate, notes } = req.body;

      if (!driverId) {
        return res.status(400).json({ success: false, message: "driverId is required" });
      }

      if (collectedCash === undefined || collectedCash === null) {
        return res.status(400).json({ success: false, message: "collectedCash is required" });
      }

      const settlement = await settlementService.reconcile(
        { driverId, collectedCash: Number(collectedCash), settlementDate, notes },
        managerId,
        companyId
      );

      return res.status(200).json({
        success: true,
        message: "EOD reconciliation completed successfully.",
        data: settlement,
      });
    } catch (error: any) {
      const isValidation = error.message.includes("not found") || error.message.includes("Invalid");
      return res.status(isValidation ? 400 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/settlements/driver/:driverId
   * Returns the settlement statement for a specific driver (paginated by date range).
   *
   * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), limit (default 90)
   */
  async getDriverStatement(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, message: "Authentication context is required" });
      }

      const rawDriverId = req.params.driverId;
      const driverId = Array.isArray(rawDriverId) ? rawDriverId[0] : rawDriverId;
      const { from, to, limit } = req.query;

      const result = await settlementService.getDriverStatement(
        driverId!,
        companyId,
        {
          ...(from !== undefined ? { from: from as string } : {}),
          ...(to !== undefined ? { to: to as string } : {}),
          ...(limit !== undefined ? { limit: Number(limit) } : {}),
        }
      );

      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      const isNotFound = error.message.includes("not found") || error.message.includes("Invalid");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/settlements/summary
   * Returns today's expected vs collected cash summary for the company.
   */
  async getTodaySummary(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, message: "Authentication context is required" });
      }

      const summary = await settlementService.getTodaySummary(companyId);
      return res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
