import { Router } from "express";
import { CompanyController } from "../controllers/company.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { UserRole } from "../types/user.type.js";
import {
  createCompanySchema,
  updateCompanySchema,
} from "../validations/company.val.js";

const router = Router();
const controller = new CompanyController();

// Only company owners can manually create a company profile.
router.post(
  "/",
  authenticate,
  authorize(UserRole.OWNER),
  validate(createCompanySchema),
  controller.create.bind(controller)
);

// Only company owners can list companies.
router.get(
  "/",
  authenticate,
  authorize(UserRole.OWNER),
  controller.getAll.bind(controller)
);

// Users can retrieve their own company; company owners can retrieve any company.
router.get(
  "/:id",
  authenticate,
  (req: any, res: any, next: any) => {
    if (req.user.role !== UserRole.OWNER && req.user.companyId !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Forbidden",
      });
    }
    next();
  },
  controller.getById.bind(controller)
);

// Only company owners can update company details.
router.patch(
  "/:id",
  authenticate,
  (req: any, res: any, next: any) => {
    if (req.user.role !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only owners can update company info",
      });
    }
    if (req.user.companyId !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Forbidden",
      });
    }
    next();
  },
  validate(updateCompanySchema),
  controller.update.bind(controller)
);

// Only company owners can delete a company.
router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.OWNER),
  controller.delete.bind(controller)
);

export default router;