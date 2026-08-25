// middlewares/company.middleware.ts

import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./userAuth.middleware.js";

export const sameCompany = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  if (
    req.user?.companyId !== req.params.companyId
  ) {

    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  next();
};