import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./userAuth.middleware.js";
import { UserRole } from "../types/user.type.js";

const CANONICAL_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.CS_MANAGER,
  UserRole.CS_AGENT,
  UserRole.DRIVER_MANAGER,
  UserRole.FINANCE_MANAGER,
  UserRole.ACCOUNTANT,
  UserRole.DRIVER,
];

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Run-time validation
    for (const r of roles) {
      if (!CANONICAL_ROLES.includes(r)) {
        throw new Error(`CRITICAL: Attempted to secure route with deprecated or invalid role: ${r}`);
      }
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userRole = req.user.role as UserRole;

    if (!CANONICAL_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your current role '${userRole}' is deprecated. Please re-login.`,
      });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden: Access Denied" });
    }

    next();
  };
};