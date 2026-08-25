import Joi from "joi";
import { UserRole } from "../types/user.type.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;


export const createUserValidation = Joi.object({
  companyId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid companyId format. Must be a valid ObjectId.",
    "any.required": "companyId is required to link the user to a company."
  }),

  name: Joi.string().min(3).max(50).required().messages({
    "string.min": "Name must be at least 3 characters long.",
    "string.max": "Name cannot exceed 50 characters.",
    "any.required": "Name is required."
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Invalid email address format.",
    "any.required": "Email is required."
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long.",
    "any.required": "Password is required."
  }),

  phone: Joi.string().regex(/^[0-9]+$/).optional().messages({
    "string.pattern.base": "Phone number must contain digits only."
  }),

  role: Joi.string()
    .valid(...Object.values(UserRole))
    .default(UserRole.DRIVER)
    .optional()
    .messages({
      "any.only": "Invalid user role provided."
    }),


  isOnline: Joi.boolean().default(false).optional(),
  currentSocketId: Joi.string().optional(),
  lastSeen: Joi.date().iso().optional()
});

// update user validation
export const updateUserValidation = Joi.object({
  name: Joi.string().min(3).max(50).optional().messages({
    "string.min": "Name must be at least 3 characters long.",
    "string.max": "Name cannot exceed 50 characters."
  }),

  email: Joi.string().email().optional().messages({
    "string.email": "Invalid email address format."
  }),

  // Optional in update: only passed if the user wants to change their password
  password: Joi.string().min(6).optional().messages({
    "string.min": "Password must be at least 6 characters long."
  }),

  phone: Joi.string().regex(/^[0-9]+$/).optional().messages({
    "string.pattern.base": "Phone number must contain digits only."
  }),

  role: Joi.string().valid(...Object.values(UserRole)).optional().messages({
    "any.only": "Invalid user role provided.",
  }),

  // Real-time fields handled by Socket.io on the server side
  isOnline: Joi.boolean().optional(),
  currentSocketId: Joi.string().allow(null, "").optional(),
  lastSeen: Joi.date().iso().optional()
});