/**
 * incident.val.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Joi validation schemas for the Dual-Ingress Incident Management API.
 *
 * Two distinct ingress channels are validated differently:
 *
 *  1. GROUND INGRESS (Drivers)
 *     - Requires GPS coordinates (driverLat, driverLng) for Haversine geo-fence
 *     - Requires proofImage (base64/URL) as mandatory evidence
 *     - Reason must be one of the structured IncidentReason enum values
 *
 *  2. ADMINISTRATIVE INGRESS (Department/CS Managers)
 *     - GPS coordinates are optional (bypass geo-fence)
 *     - proofImage is optional (managers handle disputes retrospectively)
 *     - Reason must be one of the structured IncidentReason enum values
 * ─────────────────────────────────────────────────────────────────────────────
 */

import joi from "joi";
import { IncidentReason } from "../types/shipment.type.js";
import {
  IncidentSeverity,
  IncidentEntityType,
} from "../types/incident.type.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// ── Shared Base Fields ──────────────────────────────────────────────────────

const baseIncidentFields = {
  shipmentId: joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid shipment ID format. Must be a valid 24-character hex string.",
    "any.required": "Shipment ID is required.",
  }),

  reason: joi
    .string()
    .valid(...Object.values(IncidentReason))
    .required()
    .messages({
      "any.only": `Invalid incident reason. Must be one of: ${Object.values(IncidentReason).join(", ")}.`,
      "any.required": "Incident reason is required.",
    }),

  comment: joi.string().min(5).max(1000).required().messages({
    "string.min": "Incident comment must be at least 5 characters long.",
    "string.max": "Incident comment cannot exceed 1000 characters.",
    "any.required": "Incident comment is required.",
  }),
};

// ── Ground Ingress Schema (Drivers) ─────────────────────────────────────────
// Enforces mandatory GPS coordinates for Haversine geo-fence validation
// and mandatory proof-of-incident photo upload.

export const driverIncidentSchema = joi.object({
  ...baseIncidentFields,

  driverLat: joi.number().min(-90).max(90).required().messages({
    "number.base": "Driver latitude must be a valid number.",
    "number.min": "Driver latitude must be between -90 and 90.",
    "number.max": "Driver latitude must be between -90 and 90.",
    "any.required": "Driver GPS latitude is required for ground incident reports.",
  }),

  driverLng: joi.number().min(-180).max(180).required().messages({
    "number.base": "Driver longitude must be a valid number.",
    "number.min": "Driver longitude must be between -180 and 180.",
    "number.max": "Driver longitude must be between -180 and 180.",
    "any.required": "Driver GPS longitude is required for ground incident reports.",
  }),

  proofImage: joi.string().uri().required().messages({
    "string.uri": "Proof image must be a valid URL.",
    "any.required": "Proof-of-incident photo is mandatory for driver-submitted reports.",
  }),
});

// ── Administrative Ingress Schema (Managers) ────────────────────────────────
// Bypasses geo-fence and photo requirements; managers handle disputes
// retrospectively via telephone confirmation or dashboard review.

export const adminIncidentSchema = joi.object({
  ...baseIncidentFields,

  proofImage: joi.string().uri().optional().messages({
    "string.uri": "Proof image must be a valid URL if provided.",
  }),
});

// ── Legacy Generic Incident Schema (preserved for backward compatibility) ───

export const createIncidentSchema = joi.object({
  title: joi.string().min(3).max(150).required().messages({
    "string.min": "Title must be at least 3 characters long",
    "string.max": "Title cannot exceed 150 characters.",
    "any.required": "Title is required.",
  }),
  description: joi.string().min(5).max(500).required().messages({
    "string.min": "Description must be at least 5 characters long.",
    "string.max": "Description cannot exceed 500 characters.",
    "any.required": "Description is required.",
  }),
  severity: joi
    .string()
    .valid(...Object.values(IncidentSeverity))
    .required()
    .messages({
      "any.only": "Invalid severity level provided.",
      "any.required": "Severity is required.",
    }),
  relatedEntityType: joi
    .string()
    .valid(...Object.values(IncidentEntityType))
    .required()
    .messages({
      "any.only": "Invalid related entity type. ",
      "any.required": "Related entity type is required.",
    }),
  relatedEntityId: joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base":
      "Invalid Related Entity Id format. must be a valid format.",
    "any.required": "Related Entity Id is required",
  }),
  assignedTo: joi.string().pattern(objectIdPattern).optional().messages({
    "string.pattern.base": "Invalid assignedTo user ID format.",
  }),
});