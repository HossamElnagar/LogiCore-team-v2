/**
 * incident.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dual-Ingress Incident Management Routes.
 *
 * Route Map:
 *
 *  POST   /api/incidents/driver       Ground ingress (DRIVER, RIDER)
 *  POST   /api/incidents/operations   Admin ingress  (OWNER, OPS_MGR, WH_MGR, CS)
 *  GET    /api/incidents              List incidents  (all authenticated roles)
 *  GET    /api/incidents/:id          Get by ID       (all authenticated roles)
 *  PATCH  /api/incidents/:id/status   Update status   (OWNER, OPS_MGR, WH_MGR, CS)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router } from "express";
import { IncidentController } from "../controllers/incident.controller.js";
import { IncidentActionController } from "../controllers/incidentAction.controller.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  driverIncidentSchema,
  adminIncidentSchema,
} from "../validations/incident.val.js";
import { UserRole } from "../types/user.type.js";

const router = Router();
const controller = new IncidentController();

// ── Ground Ingress: Driver / Rider ──────────────────────────────────────────
// Haversine geo-fence + proof photo enforced at the service layer.
router.post(
  "/driver",
  authenticate,
  authorize(UserRole.DRIVER),
  validate(driverIncidentSchema),
  controller.logDriverIncident.bind(controller)
);

// ── Administrative Ingress: Managers ────────────────────────────────────────
// Geo-fence and photo requirements bypassed per architectural blueprint.
router.post(
  "/admin",
  authenticate,
  authorize(UserRole.OWNER, UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER),
  validate(adminIncidentSchema),
  controller.logAdminIncident.bind(controller)
);

// ── Read Operations ─────────────────────────────────────────────────────────
// All authenticated users can view incidents within their company scope.
router.get(
  "/",
  authenticate,
  controller.list.bind(controller)
);

router.get(
  "/:id",
  authenticate,
  controller.getById.bind(controller)
);

// ── Status Updates ──────────────────────────────────────────────────────────
// Only management roles can resolve/close incidents.
router.patch(
  "/:id/status",
  authenticate,
  authorize(UserRole.OWNER, UserRole.CS_MANAGER, UserRole.CS_AGENT, UserRole.DRIVER_MANAGER),
  controller.updateStatus.bind(controller)
);

// ── Action Workflows ────────────────────────────────────────────────────────

const actionController = new IncidentActionController();

// Assign / Re-assign an agent to the ticket
router.patch(
  "/:id/assign",
  authenticate,
  authorize(UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER),
  actionController.assignAgent.bind(actionController)
);

// Escalate to Owner
router.post(
  "/:id/escalate",
  authenticate,
  authorize(UserRole.CS_MANAGER),
  actionController.escalateIncident.bind(actionController)
);

// Escalate directly to a Manager (CS_AGENT and CS_MANAGER)
router.post(
  "/:id/escalate-to-manager",
  authenticate,
  authorize(UserRole.CS_AGENT, UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER, UserRole.OWNER),
  actionController.escalateToManager.bind(actionController)
);

export default router;
