import type { Response } from "express";
import type { AuthRequest } from "../middlewares/userAuth.middleware.js";
import { DepartmentService } from "../services/department.service.js";

const departmentService = new DepartmentService();

export class DepartmentController {
  async create(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user.companyId;
      const result = await departmentService.createDepartment(companyId, req.body);
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("already exists") || error.message.includes("Email already in use")) {
        return res.status(409).json({ success: false, message: error.message });
      }
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user.companyId;
      const { status, type } = req.query;
      const departments = await departmentService.getDepartments(companyId, { status, type });
      return res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user.companyId;
      const id = req.params.id as string;
      const department = await departmentService.getDepartmentById(id, companyId);
      return res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user.companyId;
      const id = req.params.id as string;
      const department = await departmentService.updateDepartment(id, companyId, req.body);
      return res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user.companyId;
      const id = req.params.id as string;
      await departmentService.deleteDepartment(id, companyId);
      return res.status(200).json({
        success: true,
        message: "Department deleted successfully",
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async assignManager(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user.companyId;
      const id = req.params.id as string;
      const department = await departmentService.assignManager(id, companyId, req.body);
      return res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async listEmployees(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user.companyId;
      const id = req.params.id as string;
      const employees = await departmentService.getDepartmentEmployees(id, companyId);
      return res.status(200).json({
        success: true,
        data: employees,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
