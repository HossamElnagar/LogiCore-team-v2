// middlewares/auth.middleware.ts

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

    if (typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: `Invalid token ${token}`,
      });
     }

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret"
    );

    req.user = decoded;

    next();

  } catch {

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};