import { Router, json } from "express";
import { ShipmentController } from "../controllers/shipment/shipment.controller.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { UserRole } from "../types/user.type.js";
import { validate } from "../middlewares/validate.middleware.js";
import { 
  importCsvSchema,
  submitBatchSchema,
  approveBatchSchema,
  rejectBatchSchema,
  cancelBatchSchema,
  overrideBatchSchema 
} from "../validations/shipment.val.js";

const router = Router();
const controller = new ShipmentController();

router.get("/", authenticate, controller.list.bind(controller));

// Maker-Checker bulk import routes
router.post(
  "/import-csv",
  json({ limit: "5mb" }),
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  validate(importCsvSchema),
  controller.stageCsvImport.bind(controller)
);

router.post(
  "/submit-import",
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  validate(submitBatchSchema),
  controller.submitBatchForApproval.bind(controller)
);

router.post(
  "/approve-import",
  authenticate,
  authorize(UserRole.OWNER, UserRole.FINANCE_MANAGER),
  validate(approveBatchSchema),
  controller.approveImportBatch.bind(controller)
);

router.post(
  "/reject-import",
  authenticate,
  authorize(UserRole.OWNER, UserRole.FINANCE_MANAGER),
  validate(rejectBatchSchema),
  controller.rejectImportBatch.bind(controller)
);

router.post(
  "/cancel-import",
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  validate(cancelBatchSchema),
  controller.cancelStagedBatch.bind(controller)
);

router.post(
  "/override-batch",
  authenticate,
  authorize(UserRole.OWNER),
  validate(overrideBatchSchema),
  controller.overrideBatchDecision.bind(controller)
);

router.get(
  "/pending-batches",
  authenticate,
  authorize(UserRole.OWNER, UserRole.FINANCE_MANAGER),
  controller.listPendingBatches.bind(controller)
);

router.get(
  "/pending-batches/:batchId/finance",
  authenticate,
  authorize(UserRole.OWNER, UserRole.FINANCE_MANAGER),
  controller.getBatchDetailsForFinance.bind(controller)
);

router.get(
  "/pending-batches/:batchId/accountant",
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  controller.getBatchDetailsForAccountant.bind(controller)
);

// OTP Delivery Handshake endpoints
router.post("/:id/verify-otp", authenticate, controller.verifyOtp.bind(controller));
router.post("/:id/generate-otp", authenticate, controller.generateOtp.bind(controller));

// Public Customer Feedback endpoint (no authenticate middleware required)
router.post("/:id/feedback", controller.submitFeedback.bind(controller));

router.get("/:id", authenticate, controller.getById.bind(controller));
router.patch("/:id/status", authenticate, controller.updateStatus.bind(controller));


export default router;