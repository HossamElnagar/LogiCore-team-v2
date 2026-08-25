import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./userAuth.middleware.js";
import { UserRole } from "../types/user.type.js";

/**
 * Middleware to require OWNER role for a route.
 */
export const requireOwner = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (req.user.role !== UserRole.OWNER) {
    return res.status(403).json({ success: false, message: "Access denied. Owner role required." });
  }

  next();
};

/**
 * Middleware to require either OWNER role OR that the user belongs to the requested department.
 * The department ID is expected to be in `req.params.id`.
 */
export const requireDepartmentAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { role, departmentId } = req.user;
  const targetDepartmentId = req.params.id as string | undefined;

  if (role === UserRole.OWNER) {
    return next();
  }

  if (!departmentId || departmentId !== targetDepartmentId) {
    return res.status(403).json({ 
      success: false, 
      message: "Access denied. You do not belong to this department." 
    });
  }

  next();
};

/**
 * Middleware to require OWNER role OR that the user is a MANAGER of the requested department.
 * Mangers must have their role end with '_MANAGER' or be 'CUSTOMER_SUPPORT' acting as manager.
 * Wait, the specs say "both OWNER (any department) and managers (own department only via JWT departmentId match)".
 */
export const requireManagerOrOwner = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { role, departmentId } = req.user;
  const targetDepartmentId = req.params.id as string | undefined;

  if (role === UserRole.OWNER) {
    return next();
  }

  // Check if they belong to the department
  if (!departmentId || !targetDepartmentId || departmentId.toString() !== targetDepartmentId.toString()) {
    return res.status(403).json({ 
      success: false, 
      message: "Access denied. You do not belong to this department." 
    });
  }

  // Check if they are a manager
  const managerRoles = [
    UserRole.DRIVER_MANAGER,
    UserRole.CS_MANAGER,
    UserRole.FINANCE_MANAGER
  ];

  if (!managerRoles.includes(role)) {
    return res.status(403).json({ 
      success: false, 
      message: "Access denied. You must be a department manager." 
    });
  }

  next();
};
