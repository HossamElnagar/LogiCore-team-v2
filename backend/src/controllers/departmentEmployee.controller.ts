import type { Response } from "express";
import type { AuthRequest } from "../middlewares/userAuth.middleware.js";
import * as departmentEmployeeService from "../services/departmentEmployee.service.js";



export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const departmentId = req.params.id as string;
    const { companyId, role: actorRole } = req.user as any;
    
    const employee = await departmentEmployeeService.createEmployee(departmentId, companyId, req.body, actorRole);
    res.status(201).json({ success: true, data: employee });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const listEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const departmentId = req.params.id as string;
    const { companyId } = req.user as any;
    
    const employees = await departmentEmployeeService.listEmployees(departmentId, companyId);
    res.status(200).json({ success: true, data: employees });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const departmentId = req.params.id as string;
    const userId = req.params.userId as string;
    const { companyId } = req.user as any;
    const { isActive } = req.body;
    
    const employee = await departmentEmployeeService.updateEmployeeStatus(userId, departmentId, companyId, isActive);
    res.status(200).json({ success: true, data: employee });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateRole = async (req: AuthRequest, res: Response) => {
  try {
    const departmentId = req.params.id as string;
    const userId = req.params.userId as string;
    const { companyId, role: actorRole } = req.user as any;
    const { role: newRole } = req.body;
    
    const employee = await departmentEmployeeService.updateEmployeeRole(userId, departmentId, companyId, newRole, actorRole);
    res.status(200).json({ success: true, data: employee });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
