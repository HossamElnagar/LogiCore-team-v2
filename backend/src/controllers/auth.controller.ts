import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }
  async logout(req: Request, res: Response) {
    try {
      // Clear any cookies if they are used, or blacklist the token here.
      // For standard local storage token architectures, returning a 200 is sufficient.
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to logout",
      });
    }
  }
}
