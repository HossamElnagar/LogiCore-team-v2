// routes/user.routes.ts

import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { User } from "../models/User.model.js";
import { UserRole } from "../types/user.type.js";
import {
  createUserValidation,
  updateUserValidation,
} from "../validations/user.valid.js";

const router = Router();
const controller = new userController();

// Only owners and customer service managers can create users.
// Must belong to the same company.
router.post(
  "/",
  authenticate,
  authorize(UserRole.OWNER, UserRole.CS_MANAGER),
  validate(createUserValidation),
  (req: any, res: any, next: any) => {
    if (req.user.companyId !== req.body.companyId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Cannot create users for other companies",
      });
    }
    next();
  },
  controller.create.bind(controller)
);

// Any authenticated user can change their own password.
// Security note: the user ID is read from the JWT payload in the controller,
// never from the request body, so users cannot change another user's password.
router.patch(
  "/update-password",
  authenticate,
  controller.updatePassword.bind(controller)
);

// Users can list members of their own company; company owners can list any company.
router.get(
  "/company/:companyId",
  authenticate,
  (req: any, res: any, next: any) => {
    if (req.user.role !== UserRole.OWNER && req.user.companyId !== req.params.companyId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Forbidden",
      });
    }
    next();
  },
  controller.getCompanyUsers.bind(controller)
);

// Users can fetch their own details; managers/owners can fetch details of users in their company.
router.get(
  "/:id",
  authenticate,
  async (req: any, res: any, next: any) => {
    if (req.user.sub === req.params.id) return next();

    try {
      const targetUser = await User.findById(req.params.id).lean();
      if (!targetUser || targetUser.companyId.toString() !== req.user.companyId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Forbidden",
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  controller.getById.bind(controller)
);

// Users can update themselves; managers/owners can update users in their company.
router.patch(
  "/:id",
  authenticate,
  validate(updateUserValidation),
  async (req: any, res: any, next: any) => {
    if (req.user.sub === req.params.id) return next();

    if (req.user.role !== UserRole.OWNER && req.user.role !== UserRole.CS_MANAGER) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Forbidden",
      });
    }

    try {
      const targetUser = await User.findById(req.params.id).lean();
      if (!targetUser || targetUser.companyId.toString() !== req.user.companyId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Forbidden",
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  controller.update.bind(controller)
);

// Only company owners, managers, and operations managers can delete company users.
router.delete(
  "/:id",
  authenticate,
  async (req: any, res: any, next: any) => {
    const allowedRoles = [UserRole.OWNER, UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Forbidden",
      });
    }

    try {
      const targetUser = await User.findById(req.params.id).lean();
      if (!targetUser || targetUser.companyId.toString() !== req.user.companyId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Forbidden",
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  controller.delete.bind(controller)
);

export default router;