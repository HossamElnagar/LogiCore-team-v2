import { Router } from "express";
import { SettlementController } from "../controllers/settlement.controller.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";

const router = Router();
const controller = new SettlementController();

/**
 * POST /api/settlements/reconcile
 * Submit EOD cash reconciliation for a driver.
 * Requires: CS_MANAGER | DRIVER_MANAGER | FINANCE_MANAGER | ACCOUNTANT | OWNER
 */
router.post(
  "/reconcile",
  authenticate,
  controller.reconcile.bind(controller)
);

/**
 * GET /api/settlements/driver/:driverId
 * Retrieve settlement statement for a specific driver.
 * Query params: from, to (YYYY-MM-DD), limit (default 90)
 */
router.get(
  "/driver/:driverId",
  authenticate,
  controller.getDriverStatement.bind(controller)
);

/**
 * GET /api/settlements/summary
 * Retrieve company-wide cash summary for today.
 */
router.get(
  "/summary",
  authenticate,
  controller.getTodaySummary.bind(controller)
);

export default router;
