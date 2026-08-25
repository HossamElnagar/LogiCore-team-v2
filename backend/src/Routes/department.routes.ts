import { Router } from "express";
import { DepartmentController } from "../controllers/department.controller.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";
import { requireOwner, requireDepartmentAccess, requireManagerOrOwner } from "../middlewares/departmentAccess.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  assignManagerSchema,
  createEmployeeSchema,
  updateEmployeeStatusSchema,
  updateEmployeeRoleSchema,
} from "../validations/department.val.js";
import * as departmentEmployeeController from "../controllers/departmentEmployee.controller.js";

const router = Router();
const controller = new DepartmentController();

router.post(
  "/",
  authenticate,
  requireOwner,
  validate(createDepartmentSchema),
  controller.create.bind(controller)
);

router.get(
  "/",
  authenticate,
  requireOwner,
  controller.list.bind(controller)
);

router.get(
  "/:id",
  authenticate,
  requireDepartmentAccess,
  controller.getById.bind(controller)
);

router.patch(
  "/:id",
  authenticate,
  requireOwner,
  validate(updateDepartmentSchema),
  controller.update.bind(controller)
);

router.delete(
  "/:id",
  authenticate,
  requireOwner,
  controller.delete.bind(controller)
);

router.patch(
  "/:id/manager",
  authenticate,
  requireOwner,
  validate(assignManagerSchema),
  controller.assignManager.bind(controller)
);


router.get(
  "/:id/employees",
  authenticate,
  requireDepartmentAccess,
  controller.listEmployees.bind(controller)
);

router.post(
  "/:id/employees",
  authenticate,
  requireManagerOrOwner,
  validate(createEmployeeSchema),
  departmentEmployeeController.createEmployee
);

router.patch(
  "/:id/employees/:userId/status",
  authenticate,
  requireManagerOrOwner,
  validate(updateEmployeeStatusSchema),
  departmentEmployeeController.updateStatus
);

router.patch(
  "/:id/employees/:userId/role",
  authenticate,
  requireManagerOrOwner,
  validate(updateEmployeeRoleSchema),
  departmentEmployeeController.updateRole
);

export default router;
