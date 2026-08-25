import { Router, json } from "express";
import { ShipmentController } from "../controllers/shipment/shipment.controller.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { UserRole } from "../types/user.type.js";
import { validate } from "../middlewares/validate.middleware.js";
import { bulkImportSchema } from "../validations/shipment.val.js";

const router = Router();
const controller = new ShipmentController();

router.get("/", authenticate, controller.list.bind(controller));
router.get("/:id", authenticate, controller.getById.bind(controller));
router.patch("/:id/status", authenticate, controller.updateStatus.bind(controller));

// Bulk import route (limited to 2MB to handle up to 500 rows)
router.post(
  "/bulk-import",
  json({ limit: "2mb" }),
  authenticate,
  authorize(UserRole.OWNER, UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER, UserRole.ACCOUNTANT, UserRole.FINANCE_MANAGER),
  validate(bulkImportSchema),
  controller.bulkImport.bind(controller)
);


// OTP Delivery Handshake endpoints
router.post("/:id/verify-otp", authenticate, controller.verifyOtp.bind(controller));
router.post("/:id/generate-otp", authenticate, controller.generateOtp.bind(controller));

// Public Customer Feedback endpoint (no authenticate middleware required)
router.post("/:id/feedback", controller.submitFeedback.bind(controller));

export default router;