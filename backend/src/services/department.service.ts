import { Department, DepartmentType, DepartmentStatus } from "../models/Department.model.js";
import { User } from "../models/User.model.js";
import { UserRole } from "../types/user.type.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

const getManagerRoleForDeptType = (type: DepartmentType): UserRole => {
  switch (type) {
    case DepartmentType.OPERATIONS: return UserRole.DRIVER_MANAGER;
    case DepartmentType.CS: return UserRole.CS_MANAGER;
    case DepartmentType.FINANCE: return UserRole.FINANCE_MANAGER;
    default: return UserRole.OWNER;
  }
};

export class DepartmentService {
  async createDepartment(companyId: string, data: any) {
    // Check name uniqueness
    const existing = await Department.findOne({ companyId, name: data.name });
    if (existing) {
      throw new Error(`Department with name ${data.name} already exists`);
    }

    let managerId = data.managerId;
    let createdManager = null;

    if (data.managerData) {
      // Create new manager
      const existingUser = await User.findOne({ email: data.managerData.email });
      if (existingUser) {
        throw new Error("Email already in use");
      }
      const hashedPassword = await bcrypt.hash(data.managerData.password, 10);
      createdManager = await User.create({
        companyId,
        userName: data.managerData.userName,
        email: data.managerData.email,
        password: hashedPassword,
        phone: data.managerData.phone,
        role: getManagerRoleForDeptType(data.type),
      });
      managerId = createdManager._id;
    } else if (managerId) {
      // Validate existing manager
      const existingUser = await User.findOne({ _id: managerId, companyId });
      if (!existingUser) {
        throw new Error("Manager not found in this company");
      }
      if (existingUser.departmentId) {
        throw new Error("User is already assigned to a department");
      }
    }

    const deptStatus = managerId ? DepartmentStatus.ACTIVE : DepartmentStatus.CREATED;

    const department = await Department.create({
      companyId,
      name: data.name,
      type: data.type,
      location: data.location,
      description: data.description,
      managerId: managerId || undefined,
      status: deptStatus,
    });

    if (managerId) {
      await User.findByIdAndUpdate(managerId, { departmentId: department._id, role: getManagerRoleForDeptType(data.type) });
    }

    return {
      department,
      manager: createdManager,
    };
  }

  async getDepartments(companyId: string, filters: any = {}) {
    const matchStage: any = { companyId: new mongoose.Types.ObjectId(companyId) };
    if (filters.status) matchStage.status = filters.status;
    if (filters.type) matchStage.type = filters.type;

    const departments = await Department.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "departmentId",
          as: "employees",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "managerId",
          foreignField: "_id",
          as: "manager",
        },
      },
      {
        $project: {
          name: 1,
          type: 1,
          status: 1,
          location: 1,
          maxEmployees: 1,
          managerId: 1,
          managerName: { $arrayElemAt: ["$manager.userName", 0] },
          employeeCount: { $size: "$employees" },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return departments;
  }

  async getDepartmentById(id: string, companyId: string) {
    const department = await Department.findOne({ _id: id, companyId }).populate("managerId", "userName email phone");
    if (!department) {
      throw new Error("Department not found");
    }
    const employeeCount = await User.countDocuments({ departmentId: id, companyId });
    return {
      ...department.toObject(),
      employeeCount,
    };
  }

  async updateDepartment(id: string, companyId: string, data: any) {
    const department = await Department.findOne({ _id: id, companyId });
    if (!department) {
      throw new Error("Department not found");
    }

    if (data.name && data.name !== department.name) {
      const existing = await Department.findOne({ companyId, name: data.name });
      if (existing) {
        throw new Error(`Department with name ${data.name} already exists`);
      }
    }

    if (data.status === DepartmentStatus.ACTIVE && !department.managerId) {
      throw new Error("Cannot activate department without a manager");
    }

    Object.assign(department, data);
    await department.save();

    return department;
  }

  async deleteDepartment(id: string, companyId: string) {
    const department = await Department.findOne({ _id: id, companyId });
    if (!department) {
      throw new Error("Department not found");
    }

    // Unassign employees
    await User.updateMany({ departmentId: id, companyId }, { departmentId: null });

    await department.deleteOne();

    return { message: "Department deleted successfully" };
  }

  async assignManager(departmentId: string, companyId: string, payload: any) {
    const department = await Department.findOne({ _id: departmentId, companyId });
    if (!department) {
      throw new Error("Department not found");
    }

    let managerId = payload.managerId;

    if (payload.managerData) {
      const existingUser = await User.findOne({ email: payload.managerData.email });
      if (existingUser) {
        throw new Error("Email already in use");
      }
      const hashedPassword = await bcrypt.hash(payload.managerData.password, 10);
      const createdManager = await User.create({
        companyId,
        userName: payload.managerData.userName,
        email: payload.managerData.email,
        password: hashedPassword,
        phone: payload.managerData.phone,
        role: getManagerRoleForDeptType(department.type),
      });
      managerId = createdManager._id;
    } else if (managerId) {
      const existingUser = await User.findOne({ _id: managerId, companyId });
      if (!existingUser) {
        throw new Error("Manager not found in this company");
      }
      if (existingUser.departmentId && existingUser.departmentId.toString() !== departmentId) {
        throw new Error("User is already assigned to another department");
      }
    }

    // Unassign old manager if exists
    if (department.managerId && department.managerId.toString() !== managerId.toString()) {
      await User.findByIdAndUpdate(department.managerId, { departmentId: null });
    }

    department.managerId = managerId;
    if (department.status === DepartmentStatus.CREATED) {
      department.status = DepartmentStatus.ACTIVE;
    }
    await department.save();

    const userToUpdate = await User.findById(managerId);
    if (userToUpdate) {
      const updateData: any = { departmentId: department._id };
      if (userToUpdate.role !== UserRole.OWNER) {
        updateData.role = getManagerRoleForDeptType(department.type);
      }
      await User.findByIdAndUpdate(managerId, updateData);
    }

    return department;
  }

  async getDepartmentEmployees(departmentId: string, companyId: string) {
    return await User.find({ departmentId, companyId }).select("-password -currentSocketId");
  }
}
