import { Department, DepartmentType, DepartmentStatus } from "../models/Department.model.js";
import { User } from "../models/User.model.js";
import { UserRole } from "../types/user.type.js";
import bcrypt from "bcrypt";

// Define role whitelists for each department type
const roleWhitelist: Record<DepartmentType, UserRole[]> = {
  [DepartmentType.OPERATIONS]: [UserRole.DRIVER_MANAGER, UserRole.DRIVER],
  [DepartmentType.CS]: [UserRole.CS_MANAGER, UserRole.CS_AGENT],
  [DepartmentType.FINANCE]: [UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT],
};

const forbiddenRoles = [UserRole.OWNER];

export const createEmployee = async (departmentId: string, companyId: string, data: any, actorRole: UserRole) => {
  const department = await Department.findOne({ _id: departmentId, companyId });
  if (!department) {
    throw new Error("Department not found");
  }


  if (department.status !== DepartmentStatus.ACTIVE) {
    throw new Error("Cannot add employees to a non-active department");
  }

  if (forbiddenRoles.includes(data.role)) {
    throw new Error("Cannot assign restricted roles");
  }

  const allowedRoles = roleWhitelist[department.type] || [];
  if (!allowedRoles.includes(data.role)) {
    throw new Error(`Role ${data.role} is not valid for department type ${department.type}`);
  }

  // Restrict managers to only creating subordinates
  if (actorRole === UserRole.FINANCE_MANAGER && data.role !== UserRole.ACCOUNTANT) {
    throw new Error("Finance Managers can only create Accountants");
  }
  if (actorRole === UserRole.CS_MANAGER && data.role !== UserRole.CS_AGENT) {
    throw new Error("CS Managers can only create CS Agents");
  }
  if (actorRole === UserRole.DRIVER_MANAGER && data.role !== UserRole.DRIVER) {
    throw new Error("Driver Managers can only create Drivers");
  }

  const currentCount = await User.countDocuments({ departmentId });
  if (currentCount >= department.maxEmployees) {
    throw new Error("Department has reached its maximum employee limit");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newEmployee = new User({
    companyId,
    departmentId,
    userName: data.userName,
    email: data.email,
    password: hashedPassword,
    phone: data.phone,
    role: data.role,
    isActive: true,
  });

  await newEmployee.save();

  const employeeObj = newEmployee.toObject();
  delete (employeeObj as any).password;
  
  return employeeObj;
};

export const listEmployees = async (departmentId: string, companyId: string) => {
  return await User.find({ departmentId, companyId }).select("-password");
};

export const updateEmployeeStatus = async (userId: string, departmentId: string, companyId: string, isActive: boolean) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, departmentId, companyId },
    { isActive },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new Error("Employee not found in this department");
  }

  return user;
};

export const updateEmployeeRole = async (userId: string, departmentId: string, companyId: string, newRole: UserRole, actorRole: UserRole) => {
  const department = await Department.findOne({ _id: departmentId, companyId });
  if (!department) {
    throw new Error("Department not found");
  }

  if (forbiddenRoles.includes(newRole)) {
    throw new Error("Cannot assign restricted roles");
  }

  const allowedRoles = roleWhitelist[department.type] || [];
  if (!allowedRoles.includes(newRole)) {
    throw new Error(`Role ${newRole} is not valid for department type ${department.type}`);
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, departmentId, companyId },
    { role: newRole },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new Error("Employee not found in this department");
  }

  return user;
};