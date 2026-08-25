import joi from "joi";
import { ShipmentStatus } from "../types/shipment.type.js";
// MongoDB ObjectId regex pattern (24 hex characters)
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createShipmentSchema = joi.object({
  companyId: joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid companyId format.",
    "any.required": "companyId is required."
  }),

  trackingNumber: joi.string().required().messages({
    "any.required": "Tracking number is required."
  }),

  customerName: joi.string().min(3).max(200).required().messages({
    "string.min": "Customer name must be at least 3 characters long.",
    "string.max": "Customer name must be max 200 characters long.",
    "any.required": "Customer name is required."
  }),

  customerPhone: joi.string().regex(/^[0-9]+$/).required().messages({
    "string.pattern.base": "Customer phone must contain digits only.",
    "any.required": "Customer phone is required."
  }),
  
  customerEmail: joi.string().email().optional().messages({
    "string.email": "Customer email must be a valid email address."
  }),

  pickupAddress: joi.string().required().messages({
    "any.required": "Pickup address is required."
  }),

  deliveryAddress: joi.string().required().messages({
    "any.required": "Delivery address is required."
  }),

  createdBy: joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid creator user ID format.",
    "any.required": "createdBy ID is required."
  }),

  // optional
  currentLocation: joi.string().optional(),
  
  status: joi.string()
    .valid(...Object.values(ShipmentStatus))
    .default(ShipmentStatus.CREATED)
    .optional(),
    
  assignedDriver: joi.string().pattern(objectIdPattern).optional(),
  assignedVehicle: joi.string().pattern(objectIdPattern).optional(),
  //ISO 8601  : 2026-05-30T16:28:44.000Z
  estimatedDeliveryTime: joi.date().iso().optional(),
  deliveredAt: joi.date().iso().optional()
});

export const bulkShipmentRowSchema = joi.object({
  trackingNumber: joi.string().trim().min(1).required().messages({
    "any.required": "Tracking number is required.",
    "string.empty": "Tracking number cannot be empty."
  }),
  customerName: joi.string().trim().min(2).max(200).required().messages({
    "string.min": "Customer name must be at least 2 characters.",
    "string.max": "Customer name must be max 200 characters.",
    "any.required": "Customer name is required."
  }),
  customerPhone: joi.string().pattern(/^[0-9]+$/).required().messages({
    "string.pattern.base": "Customer phone must contain digits only.",
    "any.required": "Customer phone is required."
  }),
  deliveryAddress: joi.string().trim().min(1).required().messages({
    "any.required": "Delivery address is required.",
    "string.empty": "Delivery address cannot be empty."
  }),
  pickupAddress: joi.string().trim().min(1).required().messages({
    "any.required": "Pickup address is required.",
    "string.empty": "Pickup address cannot be empty."
  }),
  codAmount: joi.number().min(0).required().messages({
    "number.min": "COD amount cannot be negative.",
    "any.required": "COD amount is required."
  }),
  driverEmail: joi.string().email().required().messages({
    "string.email": "Driver email must be a valid email address.",
    "any.required": "Driver email is required."
  }),
  customerEmail: joi.string().email().optional().messages({
    "string.email": "Customer email must be a valid email address."
  }),
  paymentMethod: joi.string().valid("COD", "ONLINE").default("COD").optional()
});

export const bulkImportSchema = joi.object({
  shipments: joi.array().items(bulkShipmentRowSchema).min(1).max(500).required().messages({
    "array.min": "Bulk import must contain at least 1 shipment.",
    "array.max": "Bulk import cannot exceed 500 shipments per request.",
    "any.required": "Shipments array is required."
  })
});