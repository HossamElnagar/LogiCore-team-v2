import mongoose from "mongoose";
import type { Request, Response, NextFunction } from "express";

export const validateObjectId =
  (paramId: string) =>
  (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    const id = req.params[paramId];

    if (typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: `Invalid id ${paramId}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res.status(400).json({
        success: false,
        message: `Invalid ${paramId}`,
      });

    }

    next();
  };