import Joi from "joi";
import { DepartmentType, DepartmentStatus } from "../models/Department.model.js";
import { UserRole } from "../types/user.type.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const managerDataSchema = Joi.object({
  userName: Joi.string().min(3).max(50).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().regex(/^[0-9]+$/).optional().allow(null, ""),
});

export const createDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  type: Joi.string().valid(...Object.values(DepartmentType)).required(),
  location: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(500).optional().allow(null, ""),
  managerId: Joi.string().pattern(objectIdPattern).optional(),
  managerData: managerDataSchema.optional(),
})
  .oxor("managerId", "managerData")
  .messages({
    "object.oxor": "Provide either managerId or managerData, but not both.",
  });

export const updateDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  type: Joi.string().valid(...Object.values(DepartmentType)).optional(),
  location: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(500).optional().allow(null, ""),
  status: Joi.string().valid(...Object.values(DepartmentStatus)).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update.",
  });

export const assignManagerSchema = Joi.object({
  managerId: Joi.string().pattern(objectIdPattern).optional(),
  managerData: managerDataSchema.optional(),
})
  .xor("managerId", "managerData")
  .messages({
    "object.xor": "Provide either managerId or managerData, but not both.",
  });

export const createEmployeeSchema = Joi.object({
  userName: Joi.string().min(3).max(50).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().regex(/^[0-9]+$/).optional().allow(null, ""),
  role: Joi.string().valid(...Object.values(UserRole)).required(),
});

export const updateEmployeeStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

export const updateEmployeeRoleSchema = Joi.object({
  role: Joi.string().valid(...Object.values(UserRole)).required(),
});
